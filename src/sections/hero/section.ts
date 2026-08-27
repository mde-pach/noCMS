import { z } from 'zod';

export const schema = z.object({
  eyebrow: z.string().optional().meta({ field: 'text', label: 'Eyebrow' }),
  title:   z.string().meta({ field: 'text', label: 'Headline', inline: true }),
  body:    z.string().optional().meta({ field: 'richtext', label: 'Body', inline: true }),
  align:   z.enum(['left', 'center']).default('left').meta({ field: 'select', label: 'Alignment' }),
});

export const meta = {
  name: 'Hero',
  category: 'Headers',
  description: 'A headline and short introduction.',
  defaults: { title: 'A headline worth reading', body: 'One sentence that explains the rest.' },
};
