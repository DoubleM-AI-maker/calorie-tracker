import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function transcribeAudio(file: File): Promise<string> {
  if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'dummy') {
    throw new Error('OpenAI API Key is missing or invalid.');
  }

  try {
    const response = await openai.audio.transcriptions.create({
      file,
      model: 'whisper-1',
      language: 'de',
    });
    return response.text;
  } catch (error) {
    console.error('Whisper API Error:', error);
    throw new Error('Error during audio transcription.');
  }
}
