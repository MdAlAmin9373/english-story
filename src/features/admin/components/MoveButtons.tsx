import { secondaryButtonClass } from "./fields";

// ↑/↓ buttons that post { id, kind?, direction } to a move action.
export function MoveButtons({
  action,
  id,
  kind,
  isFirst,
  isLast,
}: {
  action: (formData: FormData) => Promise<void>;
  id: string;
  kind?: string;
  isFirst: boolean;
  isLast: boolean;
}) {
  return (
    <form action={action} className="flex gap-1">
      <input type="hidden" name="id" value={id} />
      {kind && <input type="hidden" name="kind" value={kind} />}
      <button
        type="submit"
        name="direction"
        value="up"
        disabled={isFirst}
        aria-label="উপরে সরান"
        className={secondaryButtonClass}
      >
        ↑
      </button>
      <button
        type="submit"
        name="direction"
        value="down"
        disabled={isLast}
        aria-label="নিচে সরান"
        className={secondaryButtonClass}
      >
        ↓
      </button>
    </form>
  );
}
