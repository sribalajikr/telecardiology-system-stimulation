export function processSignal(originalData, { noiseLevel = 0, latency = 0, compression = 0, signalLoss = 0 }) {
  // Deep copy to avoid mutating original
  let processedData = originalData.map(point => ({ ...point }));

  const maxVoltage = 1.2; // roughly max peak of R wave in our model

  // 1. Apply Latency (shifts time)
  // We represent latency as simply shifting the time by latency ms.
  // Although time is shifted, we will still plot it.
  const latencySeconds = latency / 1000;
  processedData = processedData.map(point => ({
    ...point,
    time: point.time + latencySeconds
  }));

  // 2. Apply Compression (Quantization & Downsampling simulation)
  // Higher compression means fewer steps and lower resolution
  if (compression > 0) {
    // Quantization step size based on compression (0-90)
    // 0 = high resolution, 90 = low resolution (large steps)
    const compressionFactor = compression / 100; // 0 to 0.9
    const quantSteps = Math.max(2, Math.floor(100 - (compressionFactor * 98)));
    const stepSize = maxVoltage / quantSteps;
    
    // Also simulate data reduction by averaging/dropping points if very high compression
    const skipPoints = Math.floor(compressionFactor * 5); // 0 to 4
    
    let temp = [];
    for (let i = 0; i < processedData.length; i++) {
      if (skipPoints > 0 && i % (skipPoints + 1) !== 0) {
        continue; // drop point
      }
      const point = processedData[i];
      // Quantize voltage
      const quantizedVoltage = Math.round(point.voltage / stepSize) * stepSize;
      temp.push({ ...point, voltage: quantizedVoltage });
    }
    processedData = temp;
  }

  // 3. Apply Noise
  if (noiseLevel > 0) {
    const noiseFactor = noiseLevel / 100;
    processedData = processedData.map(point => {
      // Random noise scaled by maxVoltage and noiseFactor
      const noise = (Math.random() - 0.5) * 2 * maxVoltage * noiseFactor;
      return {
        ...point,
        voltage: point.voltage + noise
      };
    });
  }

  // 4. Apply Signal Loss
  if (signalLoss > 0) {
    const lossFactor = signalLoss / 100;
    // We will drop contiguous chunks of data to simulate packet loss
    const chunkSize = Math.max(5, Math.floor(processedData.length * 0.01)); // chunks of 1% of data
    
    let currentLossChunk = 0;
    let temp = [];
    
    for (let i = 0; i < processedData.length; i++) {
      if (currentLossChunk > 0) {
        currentLossChunk--;
        // Add a null or undefined voltage to create a gap in the line chart
        temp.push({ time: processedData[i].time, voltage: null });
        continue;
      }
      
      if (Math.random() < lossFactor / chunkSize) { // adjusted probability to match overall loss factor roughly
        currentLossChunk = chunkSize;
        temp.push({ time: processedData[i].time, voltage: null });
      } else {
        temp.push(processedData[i]);
      }
    }
    processedData = temp;
  }

  return processedData;
}

export function calculateMetrics(originalData, processedData) {
  // Simple MSE ignoring nulls and time shifts for simplicity, 
  // actually let's calculate based on matching closest time points.
  // For college presentation, a simplified metric is fine.
  
  let squaredErrorSum = 0;
  let validPointsCount = 0;
  let signalPowerSum = 0;
  let missingPoints = 0;
  
  // Create a map for faster lookup if time aligns, but time might be shifted due to latency
  // We'll calculate MSE strictly on the index or assume aligned time without latency for the sake of metric
  // Actually, latency introduces delay. MSE should be high if we strictly compare time(t) with received(t).
  
  // Let's just calculate simplified metrics
  const originalLength = originalData.length;
  const processedLength = processedData.filter(p => p.voltage !== null).length;
  
  const estimatedDataReduction = Math.max(0, 100 - (processedLength / originalLength) * 100);
  const actualSignalLoss = 100 - (processedData.filter(p => p.voltage !== null).length / processedData.length) * 100;
  
  // For SNR/MSE, let's compare aligned points (ignoring latency shift for the metric itself, or include it?
  // Let's ignore latency shift for SNR/MSE so it just reflects waveform degradation)
  for (let i = 0; i < Math.min(originalData.length, processedData.length); i++) {
    const orig = originalData[i].voltage;
    const proc = processedData[i].voltage;
    
    if (proc === null) {
      missingPoints++;
      continue;
    }
    
    signalPowerSum += orig * orig;
    squaredErrorSum += Math.pow(orig - proc, 2);
    validPointsCount++;
  }

  const mse = validPointsCount > 0 ? squaredErrorSum / validPointsCount : 0;
  const signalPower = validPointsCount > 0 ? signalPowerSum / validPointsCount : 0;
  
  let snr = 0;
  if (mse > 0 && signalPower > 0) {
    snr = 10 * Math.log10(signalPower / mse);
  } else if (mse === 0) {
    snr = 100; // Perfect signal
  }

  return {
    mse: mse.toFixed(4),
    snr: snr.toFixed(2),
    dataReduction: estimatedDataReduction.toFixed(1),
    actualSignalLoss: actualSignalLoss.toFixed(1)
  };
}
