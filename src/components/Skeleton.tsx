export function RoomSkeleton() {
  return (
    <div className="skeleton-room">
      <div className="skeleton-avatar" />
      <div className="skeleton-content">
        <div className="skeleton-line short" />
        <div className="skeleton-line long" />
      </div>
    </div>
  );
}

export function MessageSkeleton({ own = false }: { own?: boolean }) {
  return (
    <div className={`skeleton-message-row ${own ? 'own' : 'other'}`}>
      {!own && <div className="skeleton-avatar sm" />}
      <div className={`skeleton-bubble ${own ? 'own' : 'other'}`}>
        <div className="skeleton-line long" />
        <div className="skeleton-line medium" />
      </div>
    </div>
  );
}

export function MessageSkeletonList() {
  const pattern = [false, true, false, false, true, false, true, true, false, true];
  return (
    <div className="skeleton-messages">
      {pattern.map((own, i) => (
        <MessageSkeleton key={i} own={own} />
      ))}
    </div>
  );
}
