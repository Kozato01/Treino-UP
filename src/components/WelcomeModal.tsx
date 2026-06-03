import { useState } from 'react';
import { useSettings } from '../stores/settings';
import './WelcomeModal.css';

export function WelcomeModal() {
  const hasSeenWelcome = useSettings((s) => s.hasSeenWelcome);
  const setHasSeenWelcome = useSettings((s) => s.setHasSeenWelcome);
  const setName = useSettings((s) => s.setName);
  const savedName = useSettings((s) => s.name);

  const [input, setInput] = useState(savedName);

  if (hasSeenWelcome) return null;

  function handleConfirm() {
    const trimmed = input.trim();
    if (trimmed) setName(trimmed);
    setHasSeenWelcome();
  }

  return (
    <div className="wm-overlay">
      <div className="wm-card">
        <div className="wm-face">😊</div>
        <h2 className="wm-title">Seja bem-vindo!</h2>
        <p className="wm-text">
          Que bom ter você aqui! Este app foi feito pra te ajudar a organizar seus treinos e acompanhar sua evolução.
        </p>
        <div className="wm-field">
          <label className="wm-label">Como posso te chamar?</label>
          <input
            className="wm-input"
            type="text"
            placeholder="Seu nome"
            value={input}
            onChange={(e) => setInput(e.currentTarget.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleConfirm()}
            maxLength={30}
            autoFocus
          />
        </div>
        <button className="wm-btn" onClick={handleConfirm}>
          VAMOS LÁ!
        </button>
      </div>
    </div>
  );
}
