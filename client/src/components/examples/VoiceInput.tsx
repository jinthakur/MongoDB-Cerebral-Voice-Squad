import VoiceInput from '../VoiceInput'

export default function VoiceInputExample() {
  return (
    <VoiceInput 
      onTranscript={(text) => console.log('Transcribed:', text)} 
    />
  )
}
