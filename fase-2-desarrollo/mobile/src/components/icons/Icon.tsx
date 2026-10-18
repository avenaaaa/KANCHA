import Svg, { Circle, Path } from 'react-native-svg';
import { colors } from '@/theme/colors';
import { ICONS, type IconName, type IconShape } from './paths';

interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
}

export function Icon({ name, size = 20, color = colors.text, strokeWidth = 1.75 }: IconProps) {
  const shapes = ICONS[name] as IconShape[];
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessibilityElementsHidden importantForAccessibility="no">
      {shapes.map((s, i) => {
        const paint = s.fill
          ? { fill: color, stroke: 'none', fillRule: s.evenodd ? ('evenodd' as const) : ('nonzero' as const) }
          : { fill: 'none', stroke: color, strokeWidth, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
        return s.circle ? (
          <Circle key={i} cx={s.circle.cx} cy={s.circle.cy} r={s.circle.r} {...paint} />
        ) : (
          <Path key={i} d={s.d} {...paint} />
        );
      })}
    </Svg>
  );
}
