import { useState } from "react";
import { Plus, Trash2, Pencil, Check, X } from "lucide-react";
import { formatPeso, getTotalCost, COMMODITY_OPTIONS } from "./types";
const ExpenseRow = ({
  expense,
  onAmountChange,
  onNameChange,
  onRemove
}) => {
  const [editingName, setEditingName] = useState(false);
  const [draftName, setDraftName] = useState(expense.name);
  const commitName = () => {
    const trimmed = draftName.trim();
    if (trimmed) onNameChange(expense.id, trimmed);
    setEditingName(false);
  };
  return <div className="flex items-center gap-2">
      {
    /* Name */
  }
      <div className="flex-1 min-w-0">
        {editingName ? <div className="flex items-center gap-1">
            <input
    autoFocus
    value={draftName}
    onChange={(e) => setDraftName(e.target.value)}
    onKeyDown={(e) => {
      if (e.key === "Enter") commitName();
      if (e.key === "Escape") setEditingName(false);
    }}
    className="flex-1 px-2 py-1 text-sm rounded-lg border border-[var(--hw-green-600)] outline-none"
  />
            <button
    type="button"
    onClick={commitName}
    className="p-1 text-[var(--hw-green-700)]"
  >
              <Check className="w-4 h-4" />
            </button>
            <button
    type="button"
    onClick={() => setEditingName(false)}
    className="p-1 text-[var(--hw-neutral-400)]"
  >
              <X className="w-4 h-4" />
            </button>
          </div> : <div className="flex items-center gap-1.5">
            <span className="text-sm text-[var(--hw-neutral-700)] truncate">
              {expense.name}
            </span>
            <button
    type="button"
    onClick={() => {
      setDraftName(expense.name);
      setEditingName(true);
    }}
    className="flex-shrink-0 p-1 text-[var(--hw-neutral-400)] hover:text-[var(--hw-neutral-600)] transition-colors"
    aria-label="Edit name"
  >
              <Pencil className="w-3 h-3" />
            </button>
          </div>}
      </div>

      {
    /* Amount */
  }
      <div className="flex items-center gap-1 flex-shrink-0">
        <span className="text-sm text-[var(--hw-neutral-700)]">₱</span>
        <input
    type="number"
    min="0"
    step="any"
    value={expense.amount}
    onChange={(e) => onAmountChange(
      expense.id,
      e.target.value === "" ? "" : Number(e.target.value)
    )}
    placeholder="0"
    className="w-24 px-2 py-1.5 text-sm rounded-lg border border-[var(--hw-neutral-200)] bg-white outline-none focus:border-[var(--hw-green-600)] focus:ring-1 focus:ring-[var(--hw-green-600)] transition text-right"
  />
      </div>

      {
    /* Remove (always shown so user can zero out custom items) */
  }
      <button
    type="button"
    onClick={() => onRemove(expense.id)}
    className="flex-shrink-0 p-1.5 text-[var(--hw-neutral-300)] hover:text-red-500 transition-colors"
    aria-label="Remove expense"
  >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>;
};
const Step3ProductionCosts = ({ data, onChange, errors }) => {
  const total = getTotalCost(data);
  const setMethod = (m) => onChange({ costMethod: m });
  const updateExpense = (id, patch) => onChange({
    expenses: data.expenses.map((e) => e.id === id ? { ...e, ...patch } : e)
  });
  const removeExpense = (id) => onChange({ expenses: data.expenses.filter((e) => e.id !== id) });
  const addExpense = () => {
    const id = String(Date.now());
    onChange({
      expenses: [
        ...data.expenses,
        { id, name: "New expense", amount: "", isCustom: true }
      ]
    });
  };
  return <div className="space-y-5">
      {
    /* Method toggle */
  }
      <div>
        <label className="block text-sm font-semibold text-[var(--hw-neutral-700)] mb-2">
          How would you like to enter your costs?
        </label>
        <div className="flex rounded-xl border border-[var(--hw-neutral-200)] overflow-hidden">
          {[
    { value: "simple", label: "Simple total" },
    { value: "detailed", label: "Detailed costs" }
  ].map((opt) => <button
    key={opt.value}
    type="button"
    onClick={() => setMethod(opt.value)}
    className={`flex-1 py-2.5 text-sm font-medium transition-colors ${data.costMethod === opt.value ? "bg-[var(--hw-green-700)] text-white" : "bg-white text-[var(--hw-neutral-900)] hover:bg-[var(--hw-neutral-50)]"}`}
  >
              {opt.label}
            </button>)}
        </div>
      </div>

      {
    /* Simple total */
  }
      {data.costMethod === "simple" && <div>
          <label
    htmlFor="simple-cost"
    className="block text-sm font-semibold text-[var(--hw-neutral-700)] mb-1.5"
  >
            Estimated total production cost
          </label>
          <div className="flex items-center gap-2">
            <span className="text-sm text-[var(--hw-neutral-700)] flex-shrink-0">₱</span>
            <input
    id="simple-cost"
    type="number"
    min="0"
    step="any"
    value={data.simpleCost}
    onChange={(e) => onChange({ simpleCost: e.target.value === "" ? "" : Number(e.target.value) })}
    placeholder="e.g. 25200"
    className={`
                flex-1 px-3 py-2.5 rounded-xl border text-sm outline-none transition
                focus:border-[var(--hw-green-600)] focus:ring-1 focus:ring-[var(--hw-green-600)]
                ${errors.totalCost ? "border-red-400 bg-red-50" : "border-[var(--hw-neutral-200)] bg-white"}
              `}
  />
          </div>
          {errors.totalCost && <p className="mt-1.5 text-sm text-red-600">{errors.totalCost}</p>}
        </div>}

      {
    /* Detailed costs */
  }
      {data.costMethod === "detailed" && <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] divide-y divide-[var(--hw-neutral-100)]">
            {data.expenses.map((expense) => <div key={expense.id} className="px-4 py-3">
                <ExpenseRow
    expense={expense}
    onAmountChange={(id, amount) => updateExpense(id, { amount })}
    onNameChange={(id, name) => updateExpense(id, { name })}
    onRemove={removeExpense}
  />
              </div>)}
          </div>

          <button
    type="button"
    onClick={addExpense}
    className="flex items-center gap-2 text-sm font-medium text-[var(--hw-green-700)] hover:text-[var(--hw-green-800)] transition-colors"
  >
            <Plus className="w-4 h-4" />
            Add an expense
          </button>

          {errors.totalCost && <p className="text-sm text-red-600">{errors.totalCost}</p>}
        </div>}

      {
    /* Running total */
  }
      <div className="bg-[var(--hw-green-50)] border border-[var(--hw-green-400)] rounded-2xl px-4 py-3 space-y-0.5">
        {data.commodity && <p className="text-xs text-[var(--hw-green-700)] font-medium">
            Vegetable: {(() => {
    const n = COMMODITY_OPTIONS.find((c) => c.id === data.commodity)?.name ?? "";
    return data.variant ? `${n} (${data.variant})` : n;
  })()}
          </p>}
        <p className="text-xs text-[var(--hw-green-700)] font-medium">
          Estimated total production cost
        </p>
        <p className="font-semibold text-[var(--hw-green-900)]">
          {total > 0 ? formatPeso(total) : "\u20B10"}
        </p>
      </div>

      {
    /* Farmgate price section */
  }
      <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-4 space-y-3">
        <p className="text-sm font-semibold text-[var(--hw-neutral-900)]">How will you sell?</p>

        <label className="flex items-start gap-3 cursor-pointer">
          <input
    type="checkbox"
    checked={data.useFarmgate}
    onChange={(e) => onChange({ useFarmgate: e.target.checked, farmgatePrice: e.target.checked ? data.farmgatePrice : "" })}
    className="mt-0.5 w-4 h-4 rounded border-[var(--hw-neutral-300)] text-[var(--hw-green-700)] focus:ring-[var(--hw-green-600)] cursor-pointer"
  />
          <div>
            <p className="text-sm text-[var(--hw-neutral-900)]">I will sell the produce to a buyer using farmgate price.</p>
            <p className="text-[12px] text-[var(--hw-neutral-900)] mt-0.5">
              Farmgate price is the price a buyer may pay you. You can update this later.
            </p>
          </div>
        </label>

        {data.useFarmgate ? <div>
            <label
    htmlFor="farmgate-price"
    className="block text-sm font-semibold text-[var(--hw-neutral-700)] mb-1.5"
  >
              Estimated farmgate price
            </label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-[var(--hw-neutral-700)] flex-shrink-0">₱</span>
              <input
    id="farmgate-price"
    type="number"
    min="0"
    step="any"
    value={data.farmgatePrice}
    onChange={(e) => onChange({ farmgatePrice: e.target.value === "" ? "" : Number(e.target.value) })}
    placeholder="70"
    className={`
                  flex-1 px-3 py-2.5 rounded-xl border text-sm outline-none transition
                  focus:border-[var(--hw-green-600)] focus:ring-1 focus:ring-[var(--hw-green-600)]
                  ${errors.farmgatePrice ? "border-red-400 bg-red-50" : "border-[var(--hw-neutral-200)] bg-white"}
                `}
  />
              <span className="text-sm text-[var(--hw-neutral-700)] flex-shrink-0">/kg</span>
            </div>
            {errors.farmgatePrice && <p className="mt-1.5 text-sm text-red-600">{errors.farmgatePrice}</p>}
          </div> : <p className="text-[13px] text-[var(--hw-neutral-700)] italic">
            Market price will be used as reference. Actual buyer price may be different.
          </p>}
      </div>
    </div>;
};
export {
  Step3ProductionCosts
};
