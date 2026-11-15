import React from 'react';
import classNames from 'classnames';

type Props = {
  /** Primary status copy shown beside the pulse. */
  message?: string;
  className?: string;
  /** Compact inline dots only (no progress bar). */
  compact?: boolean;
};

/**
 * Visual “still working” cue for MoMo PIN / poll / chain waits.
 */
export default function WaitingIndicator({
  message,
  className,
  compact = false,
}: Props) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className={classNames('waiting-indicator', className)}
    >
      <div className="flex items-start gap-2.5">
        <span className="waiting-dots mt-1 shrink-0" aria-hidden="true">
          <span />
          <span />
          <span />
        </span>
        {message ? (
          <p className="min-w-0 flex-1 break-words text-xs font-medium text-emerald-deep sm:text-sm">
            {message}
          </p>
        ) : (
          <span className="sr-only">Waiting for a response</span>
        )}
      </div>
      {!compact ? (
        <div className="waiting-progress mt-2.5" aria-hidden="true" />
      ) : null}
    </div>
  );
}
