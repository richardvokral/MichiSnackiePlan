export interface Intention {
  title: string;
  subtitle: string;
}

export const intentions: Intention[] = [
  { title: 'Gentle Nourishment', subtitle: 'Mindful Eating Practice' },
  { title: 'Balanced Energy', subtitle: 'Steady Throughout the Day' },
  { title: 'Colorful Variety', subtitle: 'Explore New Flavors' },
  { title: 'Calm & Nourished', subtitle: 'Listen to Your Body' },
  { title: 'Wholesome Choices', subtitle: 'Simple & Satisfying' },
  { title: 'Joyful Eating', subtitle: 'Savor Every Bite' },
  { title: 'Kind to Yourself', subtitle: 'No Perfection Needed' },
  { title: 'Fresh Start', subtitle: 'One Meal at a Time' },
  { title: 'Intuitive Balance', subtitle: 'Trust Your Hunger' },
  { title: 'Mindful Moments', subtitle: 'Eat with Presence' },
];

export function getTodaysIntention(dateStr: string): Intention {
  const dayOfYear = Math.floor(
    (new Date(dateStr).getTime() - new Date(dateStr.slice(0, 4) + '-01-01').getTime()) /
      (1000 * 60 * 60 * 24)
  );
  return intentions[dayOfYear % intentions.length];
}
