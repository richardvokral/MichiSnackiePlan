const TAG_COLORS: Record<string, string> = {
  PROTEIN: 'bg-tag-protein/10 text-tag-protein',
  VEGGIE: 'bg-tag-veggie/10 text-tag-veggie',
  'LOW SUGAR': 'bg-tag-low-sugar/10 text-tag-low-sugar',
  'DAIRY-FREE': 'bg-tag-dairy-free/10 text-tag-dairy-free',
  SWEET: 'bg-tag-sweet/10 text-tag-sweet',
  SAVORY: 'bg-tag-savory/10 text-tag-savory',
};

interface TagProps {
  label: string;
}

export default function Tag({ label }: TagProps) {
  const colors = TAG_COLORS[label] || 'bg-neutral-200 text-neutral-600';
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold tracking-wide ${colors}`}>
      {label}
    </span>
  );
}
