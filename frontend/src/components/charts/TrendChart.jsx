import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';
import ChartTooltip from './ChartTooltip.jsx';

export default function TrendChart({ data = [], series = [], height = 320 }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 12, right: 8, left: -4, bottom: 0 }}>
        <CartesianGrid stroke="#ececea" vertical={false} />
        <XAxis dataKey="date" stroke="#cfcfcb" tickLine={false} axisLine={false} tick={{ fontSize: 13, fill: '#6b6b66' }} tickMargin={10} />
        <YAxis stroke="#cfcfcb" tickLine={false} axisLine={false} tick={{ fontSize: 13, fill: '#6b6b66' }} width={44} tickMargin={6} />
        <Tooltip content={<ChartTooltip />} cursor={{ stroke: '#d8d8d4', strokeWidth: 1 }} />
        <Legend
          iconType="circle"
          wrapperStyle={{ fontSize: '13px', paddingTop: '14px' }}
          formatter={(v) => <span className="text-mute">{v}</span>}
        />
        {series.map((s) => (
          <Line
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.label}
            stroke={s.color}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 5, fill: s.color, stroke: '#fff', strokeWidth: 2 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
