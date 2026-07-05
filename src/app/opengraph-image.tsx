import { ImageResponse } from 'next/og';

// Route segment config — this image applies to every route by default.
export const alt = 'RokaMaybe — Your Arranged Marriage Tracker';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: '#fffdf8',
          color: '#1a1410',
          padding: '72px',
          fontFamily: 'serif',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            fontSize: 34,
            fontWeight: 600,
            letterSpacing: '-0.01em',
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: '#c13e2a',
              marginRight: 20,
            }}
          />
          RokaMaybe
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              fontSize: 76,
              fontWeight: 600,
              lineHeight: 1.05,
              letterSpacing: '-0.02em',
              maxWidth: 940,
            }}
          >
            Your arranged marriage tracker
          </div>
          <div
            style={{
              fontSize: 34,
              color: '#6b5d4f',
              marginTop: 28,
              maxWidth: 900,
              lineHeight: 1.3,
            }}
          >
            The calm, private dashboard for your rishta search — every prospect,
            kundli, and conversation in one place.
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            fontSize: 28,
            color: '#c13e2a',
            fontWeight: 500,
          }}
        >
          rokamaybe.com
        </div>
      </div>
    ),
    { ...size },
  );
}
