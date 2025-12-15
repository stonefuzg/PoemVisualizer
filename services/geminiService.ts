import { GoogleGenAI, Type, Modality } from "@google/genai";
import { PoemAnalysis } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const analyzePoem = async (input: string): Promise<PoemAnalysis> => {
  const model = "gemini-2.5-flash";
  
  const prompt = `
    Analyze the following Chinese poem or topic: "${input}".
    
    1. Identify the Title, Author, and Dynasty.
    2. Provide a brief era description (Visual style/Clothing).
    3. Break the poem into 2-6 distinct scenes.
    4. For each scene, provide:
       - Original Chinese text (2 lines approx).
       - Visual Prompt: A detailed English description for image generation. MUST explicitly include "Traditional Chinese Ink Wash Painting style", "Watercolor", "Masterpiece", "Atmospheric", and era-specific details (Hanfu, architecture).
       - SFX Description: Short description of the mood.
       - SFX Category: Choose exactly one of ['WIND', 'RAIN', 'WATER', 'NATURE', 'PEACEFUL', 'NONE'] based on the scene content to drive the music mood.
  `;

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          author: { type: Type.STRING },
          dynasty: { type: Type.STRING },
          eraDescription: { type: Type.STRING },
          scenes: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                text: { type: Type.STRING },
                visualDescription: { type: Type.STRING },
                sfxDescription: { type: Type.STRING },
                sfxCategory: { type: Type.STRING, enum: ['WIND', 'RAIN', 'WATER', 'NATURE', 'PEACEFUL', 'NONE'] }
              },
              required: ["text", "visualDescription", "sfxDescription", "sfxCategory"]
            }
          }
        },
        required: ["title", "author", "dynasty", "eraDescription", "scenes"]
      }
    }
  });

  if (!response.text) throw new Error("No analysis received from Gemini");
  return JSON.parse(response.text) as PoemAnalysis;
};

export const generateSceneImage = async (prompt: string): Promise<string> => {
  const model = "gemini-2.5-flash-image"; 
  
  const response = await ai.models.generateContent({
    model,
    contents: {
      parts: [{ text: prompt }]
    },
    config: {}
  });

  const parts = response.candidates?.[0]?.content?.parts;
  if (!parts) throw new Error("No image generated");

  for (const part of parts) {
    if (part.inlineData && part.inlineData.data) {
      return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
    }
  }

  throw new Error("Image data not found in response");
};

export const generateSceneAudio = async (text: string, voiceSampleBase64?: string): Promise<string> => {
  // Using standard TTS as fallback
  const model = "gemini-2.5-flash-preview-tts";
  const response = await ai.models.generateContent({
    model,
    contents: {
      parts: [{ text: text }]
    },
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: 'Kore' }
        }
      }
    }
  });

  const parts = response.candidates?.[0]?.content?.parts;
  if (!parts) throw new Error("No audio generated");

  for (const part of parts) {
    if (part.inlineData && part.inlineData.data) {
      return part.inlineData.data;
    }
  }
  throw new Error("Audio data not found in response");
};

export const generateSoundEffect = async (description: string): Promise<string> => {
  return ""; 
};