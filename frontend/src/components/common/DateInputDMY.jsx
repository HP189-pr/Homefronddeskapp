import React, { useEffect, useState } from 'react';
import { formatDateDMY } from '../../utils/date';

// A controlled DD-MM-YYYY date input.
// Props: name, value (ISO string like YYYY-MM-DD or Date), onChange(eventLike), className
// Emits onChange with an event-like object: { target: { name, value: isoStringOrEmpty } }
export default function DateInputDMY({ name, value, onChange, className, placeholder = 'DD-MM-YYYY', disabled = false }) {
  const [text, setText] = useState('');

  useEffect(() => {
    if (!value) {
      setText('');
    } else {
      setText(formatDateDMY(value));
    }
  }, [value]);

  const emit = (iso) => {
    if (typeof onChange === 'function') {
      onChange({ target: { name, value: iso } });
    }
  };

  const onInput = (e) => {
    const v = e.target.value;
    // allow only digits and dashes
    const cleaned = v.replace(/[^0-9-]/g, '').slice(0, 10);
    setText(cleaned);
    const m = /^(\d{2})-(\d{2})-(\d{4})$/.exec(cleaned);
    if (m) {
      const dd = parseInt(m[1], 10);
      const mm = parseInt(m[2], 10);
      const yyyy = parseInt(m[3], 10);
      // rudimentary validity check
      if (mm >= 1 && mm <= 12 && dd >= 1 && dd <= 31 && yyyy >= 1900 && yyyy <= 9999) {
        const iso = `${yyyy}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
        emit(iso);
        return;
      }
    }
    // if not valid full DMY, emit empty to avoid partial invalid dates propagating
    emit('');
  };

  const onBlur = () => {
    // normalize text on blur - if invalid, clear
    const m = /^(\d{2})-(\d{2})-(\d{4})$/.exec(text);
    if (!m) return setText('');
    const dd = parseInt(m[1], 10);
    const mm = parseInt(m[2], 10);
    const yyyy = parseInt(m[3], 10);
    if (!(mm >= 1 && mm <= 12 && dd >= 1 && dd <= 31 && yyyy >= 1900 && yyyy <= 9999)) {
      setText('');
      emit('');
    }
  };

  return (
    <input
      type="text"
      name={name}
      value={text}
      onChange={onInput}
      onBlur={onBlur}
      placeholder={placeholder}
      className={className}
      disabled={disabled}
      inputMode="numeric"
      pattern="\\d{2}-\\d{2}-\\d{4}"
      aria-label={name}
    />
  );
}
