import { useEffect, useRef, useState } from 'react';
import { Music2, VolumeX, Volume2 } from 'lucide-react';

export function MusicPlayer() {
  const audio = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const player = audio.current;
    if (player) player.volume = 0.3;
    return () => {
      player?.pause();
    };
  }, []);

  async function toggleMusic() {
    const player = audio.current;
    if (!player) return;
    setError('');
    if (!player.paused) {
      player.pause();
      return;
    }
    setLoading(true);
    try {
      // This runs directly from the click so browsers can allow sound.
      await player.play();
    } catch {
      setError('Music could not play. Try again.');
      setPlaying(false);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="soundtrack-bar">
      <audio
        ref={audio}
        loop
        preload="none"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
      >
        <source src="/audio/hot-roadway.m4a" type="audio/mp4" />
        <source src="/audio/hot-roadway.ogg" type="audio/ogg" />
      </audio>
      <div className="soundtrack-info">
        <Music2 size={17} />
        <div>
          <span>ARCADE RADIO</span>
          <a href="https://opengameart.org/content/hot-roadway" target="_blank" rel="noreferrer">
            Hot Roadway <i>by MintoDog · CC0</i>
          </a>
        </div>
      </div>
      <div className="music-action">
        {error && <small role="status">{error}</small>}
        <button
          className={playing ? 'music-toggle enabled' : 'music-toggle'}
          onClick={() => void toggleMusic()}
          disabled={loading}
          aria-pressed={playing}
          aria-label={playing ? 'Turn music off' : 'Turn music on'}
        >
          {playing ? <Volume2 size={15} /> : <VolumeX size={15} />}
          <span>{loading ? 'Loading…' : playing ? 'Music on' : 'Music off'}</span>
          <i aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
