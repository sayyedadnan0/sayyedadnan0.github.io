'use client'

import { useState, useEffect, useRef, useSyncExternalStore } from 'react'

const emptySubscribe = () => () => {}

export default function SoundToggle() {
  const [isPlaying, setIsPlaying] = useState(false)
  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false)

  const audioCtxRef = useRef<AudioContext | null>(null)
  const masterGainRef = useRef<GainNode | null>(null)
  const osc1Ref = useRef<OscillatorNode | null>(null)
  const osc2Ref = useRef<OscillatorNode | null>(null)
  const osc3Ref = useRef<OscillatorNode | null>(null)
  const lfoRef = useRef<OscillatorNode | null>(null)

  const startAmbientAudio = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      if (!AudioContextClass) return

      if (!audioCtxRef.current) {
        const ctx = new AudioContextClass()
        audioCtxRef.current = ctx

        // Master gain node
        const masterGain = ctx.createGain()
        masterGain.gain.setValueAtTime(0, ctx.currentTime)
        masterGainRef.current = masterGain

        // Low-pass filter for a warm, soft cinematic drone
        const filter = ctx.createBiquadFilter()
        filter.type = 'lowpass'
        filter.frequency.setValueAtTime(260, ctx.currentTime)
        filter.Q.setValueAtTime(2, ctx.currentTime)

        // Sub bass oscillator (A1 - 55 Hz)
        const osc1 = ctx.createOscillator()
        osc1.type = 'sine'
        osc1.frequency.setValueAtTime(55, ctx.currentTime)

        // Ethereal fifth harmonic (E2 - 82.4 Hz)
        const osc2 = ctx.createOscillator()
        osc2.type = 'sine'
        osc2.frequency.setValueAtTime(82.41, ctx.currentTime)

        // Subtle shimmer chord (A3 - 220 Hz)
        const osc3 = ctx.createOscillator()
        osc3.type = 'sine'
        osc3.frequency.setValueAtTime(220, ctx.currentTime)
        const osc3Gain = ctx.createGain()
        osc3Gain.gain.setValueAtTime(0.2, ctx.currentTime)
        osc3.connect(osc3Gain)

        // Slow LFO for gentle atmospheric flutter
        const lfo = ctx.createOscillator()
        lfo.type = 'sine'
        lfo.frequency.setValueAtTime(0.12, ctx.currentTime)
        const lfoGain = ctx.createGain()
        lfoGain.gain.setValueAtTime(35, ctx.currentTime)
        lfo.connect(lfoGain)
        lfoGain.connect(filter.frequency)

        // Connect nodes
        osc1.connect(filter)
        osc2.connect(filter)
        osc3Gain.connect(filter)
        filter.connect(masterGain)
        masterGain.connect(ctx.destination)

        osc1.start()
        osc2.start()
        osc3.start()
        lfo.start()

        osc1Ref.current = osc1
        osc2Ref.current = osc2
        osc3Ref.current = osc3
        lfoRef.current = lfo
      }

      if (audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume()
      }

      // Smooth fade in
      if (masterGainRef.current && audioCtxRef.current) {
        const now = audioCtxRef.current.currentTime
        masterGainRef.current.gain.cancelScheduledValues(now)
        masterGainRef.current.gain.setValueAtTime(masterGainRef.current.gain.value, now)
        masterGainRef.current.gain.linearRampToValueAtTime(0.045, now + 1.2)
      }

      setIsPlaying(true)
    } catch {
      // AudioContext not permitted or supported
    }
  }

  const stopAmbientAudio = () => {
    if (masterGainRef.current && audioCtxRef.current) {
      const now = audioCtxRef.current.currentTime
      masterGainRef.current.gain.cancelScheduledValues(now)
      masterGainRef.current.gain.setValueAtTime(masterGainRef.current.gain.value, now)
      masterGainRef.current.gain.linearRampToValueAtTime(0, now + 0.8)
    }
    setIsPlaying(false)
  }

  const toggleSound = () => {
    if (isPlaying) {
      stopAmbientAudio()
    } else {
      startAmbientAudio()
    }
  }

  useEffect(() => {
    return () => {
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        audioCtxRef.current.close().catch(() => {})
      }
    }
  }, [])

  if (!mounted) return null

  return (
    <button
      onClick={toggleSound}
      className="group relative flex items-center gap-2.5 px-3 py-1.5 rounded-full border border-white/[0.08] hover:border-white/20 bg-white/[0.02] hover:bg-white/[0.05] transition-all duration-300 select-none text-xs text-text-secondary hover:text-text"
      aria-label={isPlaying ? 'Mute atmospheric sound' : 'Play atmospheric sound'}
      title={isPlaying ? 'Mute atmosphere' : 'Play atmosphere'}
    >
      {/* Equalizer Waveform bars */}
      <div className="flex items-end gap-[2px] h-3.5 w-3.5 justify-center" aria-hidden="true">
        <span
          className={`w-[2px] rounded-full bg-accent-amber transition-all duration-300 ${
            isPlaying ? 'animate-[soundPulse_0.8s_ease-in-out_infinite_alternate]' : 'h-1 opacity-40'
          }`}
          style={{ height: isPlaying ? '100%' : '3px' }}
        />
        <span
          className={`w-[2px] rounded-full bg-accent-amber transition-all duration-300 ${
            isPlaying ? 'animate-[soundPulse_1.1s_ease-in-out_0.2s_infinite_alternate]' : 'h-1.5 opacity-40'
          }`}
          style={{ height: isPlaying ? '60%' : '5px' }}
        />
        <span
          className={`w-[2px] rounded-full bg-accent-amber transition-all duration-300 ${
            isPlaying ? 'animate-[soundPulse_0.9s_ease-in-out_0.4s_infinite_alternate]' : 'h-1 opacity-40'
          }`}
          style={{ height: isPlaying ? '90%' : '3px' }}
        />
      </div>

      <span className="hidden sm:inline font-mono text-[10px] tracking-wider uppercase opacity-80">
        {isPlaying ? 'Sound: ON' : 'Sound: OFF'}
      </span>
    </button>
  )
}
