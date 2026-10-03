export function generateECGData(samplingRate = 250, durationSeconds = 10, heartRate = 75) {
  const data = [];
  const totalSamples = samplingRate * durationSeconds;
  const beatInterval = 60 / heartRate; // seconds per beat
  const samplesPerBeat = Math.floor(beatInterval * samplingRate);
  
  for (let i = 0; i < totalSamples; i++) {
    const time = i / samplingRate;
    const positionInBeat = i % samplesPerBeat;
    const normalizedTime = positionInBeat / samplingRate; // time within the beat in seconds
    
    let voltage = 0;
    
    // Base baseline wander (very slight)
    voltage += Math.sin(time * 0.5) * 0.05;
    
    // P wave
    if (normalizedTime > 0.1 && normalizedTime < 0.2) {
      voltage += 0.15 * Math.sin((normalizedTime - 0.1) * Math.PI / 0.1);
    }
    
    // QRS complex
    if (normalizedTime > 0.25 && normalizedTime < 0.35) {
      if (normalizedTime < 0.28) {
        // Q wave
        voltage -= 0.15 * Math.sin((normalizedTime - 0.25) * Math.PI / 0.03);
      } else if (normalizedTime < 0.31) {
        // R wave
        voltage += 1.2 * Math.sin((normalizedTime - 0.28) * Math.PI / 0.03);
      } else {
        // S wave
        voltage -= 0.25 * Math.sin((normalizedTime - 0.31) * Math.PI / 0.04);
      }
    }
    
    // T wave
    if (normalizedTime > 0.45 && normalizedTime < 0.65) {
      voltage += 0.25 * Math.sin((normalizedTime - 0.45) * Math.PI / 0.2);
    }
    
    data.push({ time, voltage });
  }
  
  return data;
}
