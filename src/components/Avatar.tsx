import { getAvatarInitials, getAvatarColor } from '../utils';

interface AvatarProps {
  name: string;
  src?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  online?: boolean;
  className?: string;
}

const sizes = {
  sm: { container: 32, font: 12, dot: 8 },
  md: { container: 40, font: 15, dot: 10 },
  lg: { container: 48, font: 18, dot: 12 },
  xl: { container: 64, font: 24, dot: 14 },
};

export function Avatar({ name, src, size = 'md', online, className }: AvatarProps) {
  const { container, font, dot } = sizes[size];
  const initials = getAvatarInitials(name || '?');
  const bgColor = getAvatarColor(name || '');

  return (
    <div
      className={className}
      style={{
        position: 'relative',
        width: container,
        height: container,
        flexShrink: 0,
      }}
    >
      {src ? (
        <img
          src={src}
          alt={name}
          style={{
            width: container,
            height: container,
            borderRadius: '50%',
            objectFit: 'cover',
          }}
        />
      ) : (
        <div
          style={{
            width: container,
            height: container,
            borderRadius: '50%',
            background: bgColor,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: font,
            fontWeight: 600,
            color: '#fff',
            fontFamily: 'inherit',
          }}
        >
          {initials}
        </div>
      )}
      {online !== undefined && (
        <span
          style={{
            position: 'absolute',
            bottom: 0,
            right: 0,
            width: dot,
            height: dot,
            borderRadius: '50%',
            background: online ? '#25D366' : '#8696A0',
            border: '2px solid var(--bg-primary)',
          }}
        />
      )}
    </div>
  );
}
