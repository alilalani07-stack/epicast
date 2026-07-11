import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine,
} from 'recharts';
import ChartTooltip from './ChartTooltip.jsx';

export default function ForecastChart({ data = [], height = 360 }) {
  const boundary = data.find((d) => d.isForecastStart)?.date;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 12, right: 8, left: -4, bottom: 0 }}>
        <defs>
          <linearGradient id="gActual" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0a0a0a" stopOpacity={0.18} />
            <stop offset="100%" stopColor="#0a0a0a" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="gForecast" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2563eb" stopOpacity={0.18} />
            <stop offset="100%" stopColor="#2563eb" stopOpacity={0} />
          </linearGradient>
        </defs>

        <CartesianGrid stroke="#ececea" vertical={false} />
        <XAxis dataKey="date" stroke="#cfcfcb" tickLine={false} axisLine={false} tick={{ fontSize: 13, fill: '#6b6b66' }} tickMargin={10} />
        <YAxis stroke="#cfcfcb" tickLine={false} axisLine={false} tick={{ fontSize: 13, fill: '#6b6b66' }} width={44} tickMargin={6} />
        <Tooltip content={<ChartTooltip />} cursor={{ stroke: '#d8d8d4', strokeWidth: 1 }} />
        <Legend
          iconType="circle"
          wrapperStyle={{ fontSize: '13px', paddingTop: '14px' }}
          formatter={(v) => <span className="text-mute">{v}</span>}
        />

        {boundary && <ReferenceLine x={boundary} stroke="#cfcfcb" strokeDasharray="4 4" />}

        <Area
          type="monotone"
          dataKey="actual"
          name="Actual"
          stroke="#0a0a0a"
          strokeWidth={2}
          fill="url(#gActual)"
          dot={false}
          activeDot={{ r: 5, fill: '#0a0a0a', stroke: '#fff', strokeWidth: 2 }}
        />
        <Area
          type="monotone"
          dataKey="forecast"
          name="Forecast"
          stroke="#2563eb"
          strokeWidth={2}
          strokeDasharray="5 4"
          fill="url(#gForecast)"
          dot={false}
          activeDot={{ r: 5, fill: '#2563eb', stroke: '#fff', strokeWidth: 2 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
