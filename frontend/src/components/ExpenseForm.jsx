import { useState, useEffect } from 'react';
import api from '../lib/api';
import { getCurrencySymbol } from '../lib/currency';

const CATEGORIES = ['Food', 'Rent', 'Utilities', 'Transport', 'Entertainment', 'General'];
export default function ExpenseForm({ groupId, members, existingExpense, onAdded, onCancel, currency = 'INR' }) {
  const isEditing = Boolean(existingExpense);
  const symbol = getCurrencySymbol(currency);
  const [amount, setAmount] = useState(existingExpense ? String(existingExpense.amount) : '');
  const [category, setCategory] = useState(existingExpense?.category || 'General');
  const [description, setDescription] = useState(existingExpense?.description || '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [receiptFile, setReceiptFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (file) {
      setReceiptFile(file);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(URL.createObjectURL(file));
    }
  }

  function handleRemoveFile() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setReceiptFile(null);
    setPreviewUrl(null);
  }

  const [splitType, setSplitType] = useState(isEditing ? 'custom' : 'equal');
  const initCustomShares = () =>
    Object.fromEntries(members.map(m => [String(m.id), '']));
  const [customShares, setCustomShares] = useState(initCustomShares);
  const initPercentShares = () => {
    const even = (100 / members.length).toFixed(2);
    return Object.fromEntries(members.map(m => [String(m.id), even]));
  };
  const [percentShares, setPercentShares] = useState(initPercentShares);
  useEffect(() => {
    if (!isEditing) return;
    api
      .get(`/groups/${groupId}/expenses/${existingExpense.id}/splits`)
      .then(res => {
        const fetched = res.data.splits; // [{ userId, shareAmount }]
        const map = Object.fromEntries(
          fetched.map(s => [String(s.userId), String(s.shareAmount)])
        );
        setCustomShares(prev => {
          const next = { ...prev };
          members.forEach(m => {
            if (map[String(m.id)] !== undefined) next[String(m.id)] = map[String(m.id)];
          });
          return next;
        });
      })
      .catch(() => {/* silently fall back to empty custom shares */});
  }, [isEditing, groupId, existingExpense?.id]); 

  const totalAmount = parseFloat(amount) || 0;
  const customTotal = members.reduce((sum, m) => {
    return sum + (parseFloat(customShares[String(m.id)]) || 0);
  }, 0);
  const customValid =
    totalAmount > 0 && Math.abs(customTotal - totalAmount) < 0.005;
  const percentTotal = members.reduce((sum, m) => {
    return sum + (parseFloat(percentShares[String(m.id)]) || 0);
  }, 0);
  const percentValid =
    totalAmount > 0 &&
    Math.abs(percentTotal - 100) < 0.005 &&
    members.every(m => {
      const p = parseFloat(percentShares[String(m.id)]);
      return !isNaN(p) && p >= 0;
    });
  const submitDisabled =
    submitting ||
    !totalAmount ||
    totalAmount <= 0 ||
    (splitType === 'custom' && !customValid) ||
    (splitType === 'percentage' && !percentValid);

  function buildSplits() {
    if (splitType === 'equal') {
      const share = Math.floor((totalAmount / members.length) * 100) / 100;
      return members.map((m, i) => ({
        userId: m.id,
        shareAmount:
          i === members.length - 1
            ? Math.round((totalAmount - share * (members.length - 1)) * 100) / 100
            : share,
      }));
    }

    if (splitType === 'custom') {
      return members.map(m => ({
        userId: m.id,
        shareAmount: Math.round((parseFloat(customShares[String(m.id)]) || 0) * 100) / 100,
      }));
    }


    const rawAmounts = members.map(m => {
      const pct = parseFloat(percentShares[String(m.id)]) || 0;
      return Math.round((totalAmount * pct) / 100 * 100) / 100;
    });
    const rawSum = rawAmounts.reduce((a, b) => a + b, 0);
    const remainder = Math.round((totalAmount - rawSum) * 100) / 100;
    const last = rawAmounts.length - 1;
    rawAmounts[last] = Math.round((rawAmounts[last] + remainder) * 100) / 100;
    return members.map((m, i) => ({ userId: m.id, shareAmount: rawAmounts[i] }));
  }

  
  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    if (!totalAmount || totalAmount <= 0) {
      setError('Enter a valid amount');
      setSubmitting(false);
      return;
    }

    const splits = buildSplits();

    try {
      if (isEditing) {
        await api.put(`/groups/${groupId}/expenses/${existingExpense.id}`, {
          amount: totalAmount,
          category,
          description,
          splits,
        });
      } else if (receiptFile) {
        const formData = new FormData();
        formData.append('amount', totalAmount);
        formData.append('category', category);
        formData.append('description', description);
        formData.append('splitType', splitType);
        formData.append('splits', JSON.stringify(splits));
        formData.append('receipt', receiptFile);

        await api.post(`/groups/${groupId}/expenses`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        setAmount('');
        setDescription('');
        handleRemoveFile();
        setSplitType('equal');
        setCustomShares(initCustomShares());
        setPercentShares(initPercentShares());
      } else {
        await api.post(`/groups/${groupId}/expenses`, {
          amount: totalAmount,
          category,
          description,
          splitType,
          splits,
        });
        setAmount('');
        setDescription('');
        handleRemoveFile();
        setSplitType('equal');
        setCustomShares(initCustomShares());
        setPercentShares(initPercentShares());
      }
      onAdded?.();
    } catch (err) {
      setError(err.response?.data?.error || `Could not ${isEditing ? 'update' : 'add'} expense`);
    } finally {
      setSubmitting(false);
    }
  }

  
  function SplitToggle({ value, label }) {
    const active = splitType === value;
    return (
      <button
        type="button"
        onClick={() => setSplitType(value)}
        className={`flex-1 py-1.5 text-sm font-body rounded-md border transition-colors duration-150
          ${active
            ? 'bg-ink text-surface border-ink'
            : 'border-rule text-ink hover:bg-bg'
          }`}
      >
        {label}
      </button>
    );
  }

  
  return (
    <form onSubmit={handleSubmit} className="card p-4 mb-6 space-y-3">
      {/* Amount + Category */}
      <div className="grid grid-cols-1 min-[400px]:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-body mb-1 text-muted">
            Amount ({symbol})
          </label>
          <input
            type="number"
            step="0.01"
            min="0.01"
            required
            className="input-field font-mono"
            value={amount}
            onChange={e => setAmount(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-body mb-1 text-muted">
            Category
          </label>
          <select
            className="input-field"
            value={category}
            onChange={e => setCategory(e.target.value)}
          >
            {CATEGORIES.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-body mb-1 text-muted">
          Description
        </label>
        <input
          type="text"
          className="input-field"
          placeholder="e.g. Dinner at Cafe X"
          value={description}
          onChange={e => setDescription(e.target.value)}
        />
      </div>

      {/* Receipt (optional) */}
      {!isEditing && (
        <div>
          <label className="block text-sm font-body mb-1 text-muted">
            Receipt (optional)
          </label>
          <input
            type="file"
            accept="image/*"
            className="input-field text-sm file:mr-3 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-body file:bg-bg file:text-ink hover:file:opacity-80 cursor-pointer"
            onChange={handleFileChange}
          />
          {previewUrl && (
            <div className="mt-2 flex items-center gap-3 bg-bg p-2 rounded-md border border-rule w-fit">
              <img
                src={previewUrl}
                alt="Receipt preview"
                className="w-12 h-12 object-cover rounded border border-rule"
              />
              <div>
                <p className="text-xs font-body text-ink max-w-[150px] truncate">
                  {receiptFile?.name}
                </p>
                <button
                  type="button"
                  onClick={handleRemoveFile}
                  className="text-xs text-owe hover:opacity-75 underline font-body"
                >
                  Remove receipt
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Split type selector */}
      <div>
        <label className="block text-sm font-body mb-1.5 text-muted">
          Split type
        </label>
        <div className="flex gap-1.5">
          <SplitToggle value="equal" label="Equal" />
          <SplitToggle value="custom" label={`Custom ${symbol}`} />
          <SplitToggle value="percentage" label="Percentage" />
        </div>
      </div>

      {/* Equal: static info line */}
      {splitType === 'equal' && (
        <p className="text-xs text-muted font-body">
          Split equally among all {members.length} member{members.length !== 1 ? 's' : ''}.
        </p>
      )}

      {/* Custom amounts */}
      {splitType === 'custom' && (
        <div className="space-y-2">
          <p className="text-xs text-muted font-body">
            Enter each person's exact share in {symbol}.
          </p>
          {members.map(m => (
            <div key={m.id} className="flex items-center gap-2">
              <span className="text-sm font-body text-ink w-28 shrink-0 truncate">
                {m.name}
              </span>
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted font-mono pointer-events-none">
                  {symbol}
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="input-field font-mono pl-6"
                  value={customShares[String(m.id)]}
                  onChange={e =>
                    setCustomShares(prev => ({ ...prev, [String(m.id)]: e.target.value }))
                  }
                />
              </div>
            </div>
          ))}
          <p className={`text-sm font-mono font-medium ${
            totalAmount > 0 && !customValid ? 'text-owe' : 'text-owed'
          }`}>
            Total: {symbol}{customTotal.toFixed(2)} of {symbol}{totalAmount.toFixed(2)}
            {totalAmount > 0 && !customValid && (
              <span className="text-xs font-body ml-1">
                (difference: {symbol}{Math.abs(customTotal - totalAmount).toFixed(2)})
              </span>
            )}
          </p>
        </div>
      )}

      {/* Percentage */}
      {splitType === 'percentage' && (
        <div className="space-y-2">
          <p className="text-xs text-muted font-body">
            Enter each person's percentage share (must total 100%).
          </p>
          {members.map(m => (
            <div key={m.id} className="flex items-center gap-2">
              <span className="text-sm font-body text-ink w-28 shrink-0 truncate">
                {m.name}
              </span>
              <div className="relative flex-1">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  className="input-field font-mono pr-8"
                  value={percentShares[String(m.id)]}
                  onChange={e =>
                    setPercentShares(prev => ({ ...prev, [String(m.id)]: e.target.value }))
                  }
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted font-mono pointer-events-none">
                  %
                </span>
              </div>
              {totalAmount > 0 && (
                <span className="text-xs font-mono text-muted w-16 text-right shrink-0">
                  {symbol}{((totalAmount * (parseFloat(percentShares[String(m.id)]) || 0)) / 100).toFixed(2)}
                </span>
              )}
            </div>
          ))}
          <p className={`text-sm font-mono font-medium ${
            !percentValid && percentTotal !== 0 ? 'text-owe' : 'text-owed'
          }`}>
            Total: {percentTotal.toFixed(2)}%
            {!percentValid && percentTotal !== 0 && (
              <span className="text-xs font-body ml-1">
                (need {(100 - percentTotal).toFixed(2)}% more)
              </span>
            )}
          </p>
        </div>
      )}

      {error && <p className="text-owe text-sm font-body">{error}</p>}

      <div className="flex gap-2">
        <button type="submit" disabled={submitDisabled} className="btn-primary text-sm">
          {submitting
            ? isEditing ? 'Saving…' : 'Adding…'
            : isEditing ? 'Save changes' : 'Add expense'}
        </button>
        <button type="button" onClick={onCancel} className="btn-secondary text-sm">
          Cancel
        </button>
      </div>
    </form>
  );
}
