"use client";

import { useEffect, useId, useRef } from "react";

type Props = {
    open: boolean;
    title: string;
    message: string;
    confirmLabel: string;
    busy?: boolean;
    onConfirm: () => void;
    onCancel: () => void;
};

export default function ConfirmDialog({
    open, title, message, confirmLabel, busy = false, onConfirm, onCancel,
}: Props) {
    const dialogRef = useRef<HTMLDialogElement>(null);
    const cancelRef = useRef<HTMLButtonElement>(null);
    const titleId = useId();
    const messageId = useId();

    useEffect(() => {
        const dialog = dialogRef.current;
        if (!dialog) return;
        if (open && !dialog.open) {
            dialog.showModal();
            cancelRef.current?.focus();
        } else if (!open && dialog.open) {
            dialog.close();
        }
    }, [open]);

    return (
        <dialog
            ref={dialogRef}
            aria-labelledby={titleId}
            aria-describedby={messageId}
            onCancel={(event) => {
                if (busy) event.preventDefault();
            }}
            onClose={() => {
                if (open) onCancel();
            }}
            className="m-auto w-full max-w-md rounded-lg border border-zinc-700 bg-zinc-900 p-6 text-zinc-100 backdrop:bg-black/60"
        >
            <h2 id={titleId} className="text-lg font-semibold">{title}</h2>
            <p id={messageId} className="mt-2 text-sm text-zinc-300">{message}</p>
            <div className="mt-6 flex justify-end gap-3">
                <button ref={cancelRef} type="button" onClick={onCancel} disabled={busy}
                    className="rounded border border-zinc-600 px-3 py-1 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400">
                    Cancel
                </button>
                <button type="button" onClick={onConfirm} disabled={busy}
                    className="rounded border border-red-700 bg-red-900 px-3 py-1 text-sm text-red-100 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-300">
                    {busy ? "Deleting…" : confirmLabel}
                </button>
            </div>
        </dialog>
    );
}
