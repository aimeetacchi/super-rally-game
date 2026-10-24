import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import Phaser from 'phaser';
import {
  ArrowUpRight,
  ArrowRight,
  Flag,
  Mountain,
  Volume2,
  VolumeX,
  RotateCcw,
  Pause,
  Play,
  ChevronDown,
  Timer,
  Trophy,
  CircleHelp,
  X,
  Check,
} from 'lucide-react';
import { RallyScene, stages, type Telemetry } from './game';
import { TouchControls } from './TouchControls';
import type { TouchAction } from './touch-input';
import './style.css';
import { MusicPlayer } from './MusicPlayer';
import { vehicles, loadVehicle, type RallyVehicle } from './vehicles';
const formatTime = (seconds: number) =>
  `${Math.floor(seconds / 60)
    .toString()
    .padStart(2, '0')}:${Math.floor(seconds % 60)
    .toString()
    .padStart(2, '0')}.${Math.floor((seconds % 1) * 100)
    .toString()
    .padStart(2, '0')}`;
function MiniTrack({ stage = 0, small = false }: { stage?: number; small?: boolean }) {
  return (
    <svg viewBox="100 60 1250 820" className={small ? 'small-track' : 'mini-track'}>
      <path
        d={`M ${stages[stage].points.map((p) => p.join(',')).join(' L ')} Z`}
        fill="none"
        stroke="currentColor"
        strokeWidth={small ? 25 : 18}
        strokeLinejoin="round"
      />
      <circle cx="770" cy="760" r={small ? 30 : 28} fill="#dfff82" />
    </svg>
  );
}
function CarPreview({ car }: { car: RallyVehicle }) {
  const color = `#${car.color.toString(16).padStart(6, '0')}`,
    accent = `#${car.accent.toString(16).padStart(6, '0')}`;
  const roof = car.body === 'hatch' ? 22 : car.body === 'coupe' ? 39 : 30;
  return (
    <svg className="car-preview" viewBox="0 0 220 125" aria-hidden="true">
      <ellipse cx="110" cy="109" rx="85" ry="11" fill="#050b19" opacity=".45" />
      <rect x="32" y="77" width="22" height="33" rx="5" fill="#090f1c" />
      <rect x="166" y="77" width="22" height="33" rx="5" fill="#090f1c" />
      <path d={`M 42 105 L 46 66 L 71 ${roof} L 149 ${roof} L 174 66 L 178 105 Z`} fill={color} />
      <path d={`M 59 65 L 77 ${roof + 6} L 143 ${roof + 6} L 161 65 Z`} fill="#142b48" />
      <path d={`M 66 60 L 80 ${roof + 9} L 137 ${roof + 9} Z`} fill="#a8d7f2" opacity=".6" />
      <path d="M 50 73 H 170" stroke="white" opacity=".25" strokeWidth="4" />
      <rect x="52" y="80" width="116" height="21" rx="3" fill="#172238" />
      <rect x="49" y="77" width="33" height="11" rx="2" fill="#ff606c" />
      <rect x="138" y="77" width="33" height="11" rx="2" fill="#ff606c" />
      {car.body === 'coupe' && (
        <g fill="#ff8b8b">
          <circle cx="59" cy="83" r="5" />
          <circle cx="74" cy="83" r="5" />
          <circle cx="146" cy="83" r="5" />
          <circle cx="161" cy="83" r="5" />
        </g>
      )}
      <path d="M 101 70 V 94 M 115 70 V 94" stroke={accent} strokeWidth="6" />
      <rect x="95" y="96" width="30" height="8" rx="1" fill="#e9edf4" />
      <path d="M 57 76 V 65 M 163 76 V 65" stroke="#101b30" strokeWidth="7" />
      <rect x="31" y="60" width="158" height="8" rx="2" fill="#101b30" />
      {car.body === 'hatch' && <path d="M 46 93 H 174" stroke={accent} strokeWidth="4" />}
      {car.id === 'impreza' && (
        <g fill={accent}>
          <rect x="38" y="99" width="9" height="10" />
          <rect x="173" y="99" width="9" height="10" />
        </g>
      )}
    </svg>
  );
}
function GarageSelection({
  vehicle,
  onSelect,
}: {
  vehicle: RallyVehicle;
  onSelect: (car: RallyVehicle) => void;
}) {
  return (
    <div className="garage">
      <div className="car-grid" role="group" aria-label="Choose your rally car">
        {vehicles.map((car) => (
          <button
            key={car.id}
            className={`car-option ${car.id === vehicle.id ? 'selected' : ''}`}
            onClick={() => onSelect(car)}
            aria-pressed={car.id === vehicle.id}
            aria-label={`Select ${car.name}`}
          >
            <span className="car-check">
              {car.id === vehicle.id ? (
                <Check size={12} />
              ) : (
                String(vehicles.indexOf(car) + 1).padStart(2, '0')
              )}
            </span>
            <CarPreview car={car} />
            <strong>{car.name}</strong>
            <small>{car.edition}</small>
          </button>
        ))}
      </div>
      <div className="car-info">
        <p>{vehicle.description}</p>
        <div className="car-stats">
          {['ACCEL', 'HANDLING', 'SPEED'].map((label, i) => (
            <div key={label}>
              <span>{label}</span>
              <div aria-label={`${label}: ${vehicle.stats[i]} out of 5`}>
                {Array.from({ length: 5 }, (_, j) => (
                  <i key={j} className={j < vehicle.stats[i] ? 'filled' : ''} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      <small className="garage-note">
        Arcade interpretations · styling and handling vary by car
      </small>
    </div>
  );
}
function App() {
  const [vehicle, setVehicle] = useState<RallyVehicle>(loadVehicle);
  const [changingCar, setChangingCar] = useState(false),
    [draftVehicle, setDraftVehicle] = useState<RallyVehicle>(vehicle);
  const carDialog = useRef<HTMLDialogElement>(null),
    resumeAfterPicker = useRef(false),
    changeCarButton = useRef<HTMLButtonElement>(null);
  const holder = useRef<HTMLDivElement>(null),
    scene = useRef<RallyScene | null>(null);
  const [stage, setStage] = useState(0),
    [status, setStatus] = useState<'ready' | 'racing' | 'paused' | 'finished'>('ready'),
    [sound, setSound] = useState(false),
    [help, setHelp] = useState(false),
    [picker, setPicker] = useState(false);
  const onTouchControl = useCallback((action: TouchAction, pressed: boolean) => {
    scene.current?.setTouch(action, pressed);
  }, []);
  const [data, setData] = useState<Telemetry>({
    speed: 0,
    time: 0,
    lap: 1,
    best: null,
    surface: 'Asphalt',
    progress: 0,
    position: 8,
    remaining: 90,
    finished: false,
    sunset: 0,
  });
  useEffect(() => {
    if (!holder.current) return;
    const s = new RallyScene(stage, setData, () => setStatus('finished'));
    s.setVehicle(vehicle);
    scene.current = s;
    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: holder.current,
      backgroundColor: '#267bce',
      scale: {
        mode: Phaser.Scale.RESIZE,
        width: holder.current.clientWidth,
        height: holder.current.clientHeight,
      },
      scene: s,
      render: { antialias: true },
      input: { keyboard: true },
    });
    const resize = new ResizeObserver(() => {
      if (holder.current)
        game.scale.resize(holder.current.clientWidth, holder.current.clientHeight);
    });
    resize.observe(holder.current);
    setStatus('ready');
    setSound(false);
    return () => {
      resize.disconnect();
      scene.current = null;
      game.destroy(true);
    };
  }, [stage]);
  useEffect(() => {
    scene.current?.setVehicle(vehicle);
    try {
      localStorage.setItem('rally-vehicle', vehicle.id);
    } catch {
      /* Optional preference. */
    }
  }, [vehicle, stage]);
  const openCarPicker = () => {
    resumeAfterPicker.current = status === 'racing';
    if (status === 'racing') {
      scene.current?.control('pause');
      setStatus('paused');
    }
    setDraftVehicle(vehicle);
    setChangingCar(true);
  };
  const closeCarPicker = () => {
    setChangingCar(false);
    if (resumeAfterPicker.current) {
      scene.current?.control('start');
      setStatus('racing');
    }
    changeCarButton.current?.focus();
  };
  const confirmCar = () => {
    scene.current?.control('reset');
    scene.current?.setVehicle(draftVehicle);
    setVehicle(draftVehicle);
    setStatus('ready');
    setChangingCar(false);
    resumeAfterPicker.current = false;
    changeCarButton.current?.focus();
  };
  useEffect(() => {
    if (changingCar) {
      carDialog.current?.showModal();
      carDialog.current?.querySelector<HTMLButtonElement>('[aria-pressed="true"]')?.focus();
    }
  }, [changingCar]);
  const start = () => {
    if (status === 'finished') scene.current?.control('reset');
    scene.current?.control('start');
    setStatus('racing');
  };
  const pause = () => {
    if (status === 'ready' || status === 'finished') return;
    scene.current?.control('pause');
    setStatus(status === 'paused' ? 'racing' : 'paused');
  };
  const reset = () => {
    scene.current?.control('reset');
    setStatus('ready');
  };
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (changingCar) return;
      if (e.code === 'Escape') pause();
      if (e.code === 'KeyR') reset();
      if (
        e.code === 'Enter' &&
        status === 'ready' &&
        !help &&
        !(e.target instanceof Element && e.target.closest('button,a'))
      )
        start();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [status, help, changingCar]);
  return (
    <div className="app-shell" data-race-status={status}>
      <header className="flex items-center justify-between">
        <a className="brand" href="#">
          <span className="brand-symbol">╱╱</span> SUPER RALLY<span className="brand-dot">®</span>
        </a>
        <nav className="flex items-center gap-8">
          <span className="nav-active">Arcade race</span>
          <button onClick={() => setHelp(true)} className="nav-link">
            How to play <ArrowUpRight size={14} />
          </button>
        </nav>
        <span className="edition">
          THE ARCADE SERIES <span>VOL. 01</span>
        </span>
      </header>
      <main>
        <section className="intro flex items-end justify-between">
          <div>
            <div className="eyebrow">
              <span /> FULL THROTTLE. PURE ARCADE.
            </div>
            <h1>
              Chase the <em>horizon.</em>
            </h1>
            <p>Three laps. Eight drivers. One place on the podium.</p>
          </div>
          <div className="weather">
            <span className="sun">☀</span>
            <div>
              {data.sunset === 0
                ? 'Blue skies. Green lights.'
                : data.sunset < 1
                  ? 'Chasing the setting sun.'
                  : 'Sunset skies. Neon nights.'}
              <small>
                {Math.round(28 - data.sunset * 4)}°C <span> / </span>{' '}
                {data.sunset === 0
                  ? 'DAYTIME'
                  : data.sunset < 1
                    ? 'SUNSET APPROACHING'
                    : 'GOLDEN HOUR'}
              </small>
            </div>
          </div>
        </section>
        <section className="rally-layout">
          <div className="game-column">
            <div className="game-topbar">
              <span>
                <span className="live-dot" />{' '}
                {status === 'racing'
                  ? 'STAGE LIVE'
                  : status === 'paused'
                    ? 'STAGE PAUSED'
                    : '90s SPIRIT. FULL THROTTLE.'}
              </span>
              <span>
                0{stage + 1} <span className="muted">/ 03 STAGES</span>
              </span>
            </div>
            <div
              className="game-viewport"
              tabIndex={0}
              aria-label="Arcade racing game. Use arrow keys to drive, space to drift."
            >
              <div ref={holder} className="phaser-holder" />
              <div className="track-label">
                <span className="flag">{['☀', '🌊', '⛰'][stage]}</span>
                <div>
                  {stages[stage].name}
                  <small>
                    {stages[stage].region} · {stages[stage].length} KM
                  </small>
                </div>
              </div>
              <div className="arcade-hud">
                <div>
                  <small>POSITION</small>
                  <strong>
                    {data.position}
                    <i>/ 8</i>
                  </strong>
                </div>
                <div className={data.remaining < 15 ? 'clock danger' : 'clock'}>
                  <small>TIME LEFT</small>
                  <strong>{data.remaining}</strong>
                </div>
                <div>
                  <small>LAP</small>
                  <strong>
                    {data.lap}
                    <i>/ 3</i>
                  </strong>
                </div>
              </div>
              <div className="in-game-map">
                <MiniTrack stage={stage} />
              </div>
              {(status === 'ready' || status === 'paused' || status === 'finished') && (
                <div className="game-overlay">
                  <div className={status === 'ready' ? 'start-card garage-card' : 'start-card'}>
                    <span className="overline">
                      {status === 'finished'
                        ? data.finished
                          ? 'CHECKERED FLAG!'
                          : 'TIME UP!'
                        : status === 'paused'
                          ? 'TAKE A BREATHER.'
                          : 'YOUR RACE. YOUR RALLY LEGEND.'}
                    </span>
                    <h2>
                      {status === 'finished'
                        ? data.finished
                          ? 'Race complete.'
                          : 'One more try?'
                        : status === 'paused'
                          ? 'On a pit stop.'
                          : 'CHOOSE YOUR RIDE.'}
                    </h2>
                    <p>
                      {status === 'finished'
                        ? data.finished
                          ? `P${data.position} · Your time: ${formatTime(data.time)}`
                          : 'Keep the speed up and beat the clock.'
                        : status === 'paused'
                          ? 'Your next corner can wait.'
                          : 'Four rally-inspired rides. Find your favourite.'}
                    </p>
                    {status === 'ready' && (
                      <GarageSelection vehicle={vehicle} onSelect={setVehicle} />
                    )}
                    <button className="primary-button" onClick={start}>
                      {status === 'finished'
                        ? 'Race again'
                        : status === 'paused'
                          ? 'Back to the road'
                          : 'Let’s go racing'}{' '}
                      <ArrowRight size={18} />
                    </button>
                    {status === 'ready' && <small>PRESS ENTER TO START</small>}
                  </div>
                </div>
              )}
              <div className="game-bottom">
                <div className="surface-tag">
                  <span /> {data.surface.toUpperCase()}
                </div>
                <div className="speed">
                  <strong>{data.speed.toString().padStart(3, '0')}</strong>
                  <span>KM/H</span>
                  <div className="speed-bars">
                    {Array.from({ length: 14 }, (_, i) => (
                      <i
                        key={i}
                        style={{ background: i < data.speed / 23 ? '#ffd34e' : '#ffffff30' }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <TouchControls
              visible={status === 'racing' || status === 'paused'}
              enabled={status === 'racing' && !changingCar && !help}
              onControl={onTouchControl}
            />
            <div className="game-toolbar">
              <span>
                <span className="keycap">↵</span> INSERT COIN? NAH. JUST DRIVE.
              </span>
              <div>
                <button
                  onClick={() => {
                    scene.current?.control('sound');
                    setSound(!sound);
                  }}
                  title={sound ? 'Turn engine sound off' : 'Turn engine sound on'}
                  aria-label={sound ? 'Turn engine sound off' : 'Turn engine sound on'}
                  aria-pressed={sound}
                >
                  {sound ? <Volume2 size={18} /> : <VolumeX size={18} />}
                </button>
                <button onClick={reset} title="Restart (R)" aria-label="Restart">
                  <RotateCcw size={17} />
                </button>
                <button
                  onClick={pause}
                  disabled={status === 'ready' || status === 'finished'}
                  title="Pause (Esc)"
                  aria-label={status === 'paused' ? 'Resume' : 'Pause'}
                >
                  {status === 'paused' ? <Play size={18} /> : <Pause size={18} />}
                </button>
                <span className="toolbar-divider" />
                <button onClick={() => setHelp(true)} title="Controls" aria-label="Controls">
                  <CircleHelp size={18} />
                </button>
              </div>
            </div>
            <MusicPlayer />
          </div>
          <aside>
            <div className="selected-ride">
              <CarPreview car={vehicle} />
              <div>
                <small>YOUR RIDE</small>
                <strong>{vehicle.name}</strong>
                <button ref={changeCarButton} onClick={openCarPicker} aria-haspopup="dialog">
                  Change car <ArrowRight size={12} />
                </button>
              </div>
            </div>
            <div className="stage-panel">
              <div className="panel-heading">
                <span>SELECT YOUR CIRCUIT</span>
                <Mountain size={18} />
              </div>
              <button
                className="stage-selector"
                onClick={() => setPicker(!picker)}
                aria-expanded={picker}
              >
                <div>
                  <small>SELECT CIRCUIT</small>
                  <strong>{stages[stage].name}</strong>
                </div>
                <ChevronDown size={18} />
              </button>
              {picker && (
                <div className="stage-options">
                  {stages.map((s, i) => (
                    <button
                      key={s.name}
                      onClick={() => {
                        setStage(i);
                        setPicker(false);
                      }}
                    >
                      {s.name}
                      {stage === i && <Check size={15} />}
                    </button>
                  ))}
                </div>
              )}
              <div className="stage-art">
                <div className="contours" />
                <MiniTrack stage={stage} />
                <span>0{stage + 1}</span>
                <div className="art-caption">
                  {stages[stage].region}
                  <br />
                  <small>{'3 LAPS · 8 DRIVERS'}</small>
                </div>
              </div>
              <div className="stage-details">
                <div>
                  <span>Distance</span>
                  <strong>
                    {stages[stage].length} <small>km</small>
                  </strong>
                </div>
                <div>
                  <span>Surface</span>
                  <strong>{stages[stage].surface}</strong>
                </div>
                <div>
                  <span>Difficulty</span>
                  <strong>
                    <i className="difficulty-bars">
                      ▰▰<b>▰</b>
                    </i>{' '}
                    {stages[stage].difficulty}
                  </strong>
                </div>
              </div>
            </div>
            <div className="timing-panel">
              <div className="panel-heading">
                <span>RACE TELEMETRY</span>
                <Timer size={17} />
              </div>
              <div className="current-time">
                <span>Race time</span>
                <strong>{formatTime(data.time)}</strong>
              </div>
              <div className="timing-bottom">
                <span>
                  <Trophy size={15} /> Personal best
                </span>
                <strong>{data.best ? formatTime(data.best) : '— — : — —'}</strong>
              </div>
              <div className="progress-track">
                <i style={{ width: `${data.progress * 100}%` }} />
              </div>
              <div className="progress-label">
                <span>RACE PROGRESS</span>
                <span>{Math.round(data.progress * 100)}%</span>
              </div>
            </div>
            <div className="tip">
              <span>↳</span>
              <p>
                Keep your foot in.
                <br />
                <strong>Cross the line for +25 seconds.</strong>
              </p>
            </div>
          </aside>
        </section>
        <section className="controls-strip">
          <div className="controls-title">
            <span className="tiny-flag">
              <Flag size={17} />
            </span>
            <div>
              Straight from the arcade.<small>The next best thing to a racing cabinet.</small>
            </div>
          </div>
          <div className="control-item">
            <div className="keys">
              <kbd>↑</kbd>
              <kbd>↓</kbd>
            </div>
            <span>Accelerate / Brake</span>
          </div>
          <div className="control-item">
            <div className="keys">
              <kbd>←</kbd>
              <kbd>→</kbd>
            </div>
            <span>Steer</span>
          </div>
          <div className="control-item">
            <kbd className="space-key">SPACE</kbd>
            <span>Handbrake & drift</span>
          </div>
          <button onClick={() => setHelp(true)}>
            All controls <ArrowUpRight size={15} />
          </button>
        </section>
      </main>
      <footer>
        <span>BORN IN THE ARCADE. BUILT FOR THE BROWSER.</span>
        <span>
          NO DOWNLOADS. JUST DRIVE. <span className="footer-spark">✳</span>
        </span>
        <span>SUPER RALLY © {new Date().getFullYear()}</span>
      </footer>
      {changingCar && (
        <dialog
          ref={carDialog}
          className="car-change-dialog"
          aria-labelledby="car-change-title"
          aria-describedby="car-change-description"
          onCancel={(e) => {
            e.preventDefault();
            closeCarPicker();
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) closeCarPicker();
          }}
        >
          <div className="car-change-content">
            <button className="close-modal" onClick={closeCarPicker} aria-label="Close car picker">
              <X size={20} />
            </button>
            <span className="overline">BACK TO THE GARAGE</span>
            <h2 id="car-change-title">CHANGE YOUR RIDE.</h2>
            <p id="car-change-description">
              {status === 'paused'
                ? 'Your race is paused. Confirming a car starts a fresh race.'
                : 'Pick a rally car, then confirm your choice.'}
            </p>
            <GarageSelection vehicle={draftVehicle} onSelect={setDraftVehicle} />
            <div className="car-change-actions">
              <button className="cancel-car" onClick={closeCarPicker}>
                {resumeAfterPicker.current ? 'Keep car & resume' : 'Cancel'}
              </button>
              <button className="primary-button" onClick={confirmCar}>
                {status === 'paused' ? 'Use car & restart' : 'Use this car'}{' '}
                <ArrowRight size={17} />
              </button>
            </div>
          </div>
        </dialog>
      )}
      {help && (
        <div className="modal-backdrop" onClick={() => setHelp(false)}>
          <div
            className="help-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="help-title"
            onClick={(e) => e.stopPropagation()}
          >
            <button className="close-modal" onClick={() => setHelp(false)} aria-label="Close">
              <X size={20} />
            </button>
            <span className="eyebrow">A QUICK DRIVER'S BRIEFING</span>
            <h2 id="help-title">
              Gentlemen,
              <br />
              start your engines.
            </h2>
            <p>
              On phones, hold GO and steer with your other thumb. Brake and Drift also work with
              touch. Finish three laps before time runs out. Race seven rivals, stay on the asphalt,
              and earn 25 bonus seconds each lap. Your best complete race is saved locally.
            </p>
            <div className="help-row">
              <kbd>W / ↑</kbd>
              <span>Accelerate</span>
            </div>
            <div className="help-row">
              <kbd>S / ↓</kbd>
              <span>Brake</span>
            </div>
            <div className="help-row">
              <kbd>A D / ← →</kbd>
              <span>Steer left and right</span>
            </div>
            <div className="help-row">
              <kbd>SPACE</kbd>
              <span>Hold to drift through corners</span>
            </div>
            <div className="help-row">
              <kbd>ESC / R</kbd>
              <span>Pause / restart</span>
            </div>
            <button className="primary-button" onClick={() => setHelp(false)}>
              Got it. Let's drive. <ArrowRight size={17} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
