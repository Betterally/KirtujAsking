
import type { Question } from './types';

export const initialQuestions: Question[] = [
  {
    id: 'q1',
    text: { en: 'What is the capital of Turkey?', tr: 'Türkiye\'nin başkenti neresidir?' },
    choices: [
      {
        id: 'q1c1',
        text: { en: 'Istanbul', tr: 'İstanbul' },
        media: [{ type: 'image', url: 'https://placehold.co/600x400.png', altText: { en: 'Image of Istanbul', tr: 'İstanbul resmi' }, dataAiHint: 'Istanbul cityscape' }],
      },
      {
        id: 'q1c2',
        text: { en: 'Ankara', tr: 'Ankara' },
        media: [{ type: 'image', url: 'https://placehold.co/600x400.png', altText: { en: 'Image of Ankara', tr: 'Ankara resmi' }, dataAiHint: 'Ankara monument' }],
      },
      {
        id: 'q1c3',
        text: { en: 'Izmir', tr: 'İzmir' },
        media: [{ type: 'audio', url: 'https://interactive-examples.mdn.mozilla.net/media/cc0-audio/t-rex-roar.mp3', altText: { en: 'Audio: Roar', tr: 'Ses: Kükreme' } }],
      },
    ],
  },
  {
    id: 'q2',
    text: { en: 'Which of these is a primary color?', tr: 'Hangisi ana renktir?' },
    choices: [
      {
        id: 'q2c1',
        text: { en: 'Green', tr: 'Yeşil' },
        media: [{ type: 'video', url: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4', altText: { en: 'Video: Flower blooming', tr: 'Video: Çiçek açması'} }],
      },
      {
        id: 'q2c2',
        text: { en: 'Orange', tr: 'Turuncu' },
        media: [], // Empty array for no media
      },
      {
        id: 'q2c3',
        text: { en: 'Red', tr: 'Kırmızı' },
        media: [{ type: 'image', url: 'https://placehold.co/600x400.png', altText: { en: 'Red color splash', tr: 'Kırmızı renk sıçraması' }, dataAiHint: 'red abstract' }],
      },
    ],
  },
  {
    id: 'q3',
    text: { en: 'What is 2 + 2?', tr: '2 + 2 kaç eder?' },
    choices: [
      { id: 'q3c1', text: { en: '3', tr: '3' }, media: [] },
      { id: 'q3c2', text: { en: '4', tr: '4' }, media: [{ type: 'image', url: 'https://placehold.co/300x200.png', altText: { en: 'Number four', tr: 'Dört rakamı'}, dataAiHint: 'number four' }] },
      { id: 'q3c3', text: { en: '5', tr: '5' }, media: [] },
    ],
  }
];
