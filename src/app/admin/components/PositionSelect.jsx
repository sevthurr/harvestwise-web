import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown } from "lucide-react";
import { adminApi } from "../../../services/api";
import {
  GreenBtn,
  GhostBtn,
  inputCls
} from "../../global/components/ui/hw-ui";

const ADD_NEW_VALUE = "__add_new__";

const PositionSelect = ({ id, value, onChange, className }) => {
  const queryClient = useQueryClient();
  const selectRef = useRef(null);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [addError, setAddError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { data, isError } = useQuery({
    queryKey: ["adminPositions"],
    queryFn: adminApi.listPositions,
    staleTime: 60_000
  });

  const positions = data?.items || [];
  // Keep the controlled value visible while the list is still loading.
  const valueMissing = value && !positions.some((p) => p.position_name === value);

  const handleSelectChange = (e) => {
    const next = e.target.value;
    if (next === ADD_NEW_VALUE) {
      setAdding(true);
      setAddError("");
      return;
    }
    onChange(next);
  };

  const resetAddForm = () => {
    setAdding(false);
    setNewName("");
    setAddError("");
    selectRef.current?.focus();
  };

  const handleAdd = async () => {
    const cleaned = newName.trim().replace(/\s+/g, " ");
    if (!cleaned) {
      setAddError("Enter a position name.");
      return;
    }
    setSubmitting(true);
    setAddError("");
    try {
      const created = await adminApi.createPosition({ position_name: cleaned });
      await queryClient.invalidateQueries({ queryKey: ["adminPositions"] });
      onChange(created.position_name);
      resetAddForm();
    } catch (err) {
      setAddError(err.message || "Failed to add position.");
    } finally {
      setSubmitting(false);
    }
  };

  if (isError) {
    return (
      <div className={className}>
        <div className="relative">
          <select id={id} disabled value="" onChange={() => {}} className={`${inputCls} appearance-none pr-9`}>
            <option value="">Select position…</option>
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-black pointer-events-none" />
        </div>
        <p className="mt-1.5 text-[12px] text-red-600 font-medium">Could not load positions.</p>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="relative">
        <select ref={selectRef} id={id} value={value} onChange={handleSelectChange} className={`${inputCls} appearance-none pr-9`}>
          <option value="">Select position…</option>
          {valueMissing && <option value={value}>{value}</option>}
          {positions.map((p) => (
            <option key={p.id} value={p.position_name}>{p.position_name}</option>
          ))}
          <option value={ADD_NEW_VALUE}>+ Add new position…</option>
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-black pointer-events-none" />
      </div>

      {adding && (
        <div className="mt-2 rounded-xl border border-[var(--hw-neutral-200)] bg-[var(--hw-neutral-50)] p-3 space-y-2">
          <label htmlFor={`${id}-new`} className="sr-only">New position name</label>
          <input
            id={`${id}-new`}
            type="text"
            autoFocus
            placeholder="New position name"
            value={newName}
            onChange={(e) => {
              setNewName(e.target.value);
              if (addError) setAddError("");
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAdd();
              } else if (e.key === "Escape") {
                resetAddForm();
              }
            }}
            className={inputCls}
          />
          {addError && <p className="text-[13px] text-red-600 font-medium">{addError}</p>}
          <div className="flex gap-2">
            <GreenBtn onClick={handleAdd} disabled={submitting}>{submitting ? "Adding..." : "Add"}</GreenBtn>
            <GhostBtn onClick={resetAddForm}>Cancel</GhostBtn>
          </div>
        </div>
      )}
    </div>
  );
};

export default PositionSelect;
