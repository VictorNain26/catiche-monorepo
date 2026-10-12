import * as React from 'react';
import { cn } from '../lib/utils';

interface BarSeries {
  label: string;
  /** One value per category, in the order of the categories. */
  values: readonly number[];
}

/** One to four series: the chart palette has four colors, in a fixed order. */
type BarSeriesList =
  | readonly [BarSeries]
  | readonly [BarSeries, BarSeries]
  | readonly [BarSeries, BarSeries, BarSeries]
  | readonly [BarSeries, BarSeries, BarSeries, BarSeries];

interface BarChartProps {
  /** What the chart shows, in one sentence, read before the bars. */
  message: string;
  /** Vertical for the days of a week, in their order; horizontal for categories, sorted from the largest. */
  orientation: 'vertical' | 'horizontal';
  /** The header of the categories in the table of values: « Jour », « Matière ». */
  categoryLabel: string;
  categories: readonly string[];
  series: BarSeriesList;
  /** The unit of bare numbers, said under the message and in the table: « minutes ». */
  unit?: string;
  format?: (value: number) => string;
  className?: string;
}

const FILLS = ['fill-chart-1', 'fill-chart-2', 'fill-chart-3', 'fill-chart-4'] as const;
const SWATCHES = ['bg-chart-1', 'bg-chart-2', 'bg-chart-3', 'bg-chart-4'] as const;

// The drawing is laid out in percentages of its box, so that the text keeps its own size at any
// width: the band above the bars holds their values, the band below the categories.
const PLOT_TOP = 14;
const BASELINE = 84;
const BAR_SHARE = 0.6;

const percent = (value: number) => `${String(Number(value.toFixed(3)))}%`;

/**
 * A bar chart as the charter wants it (`docs/charte.md`, « Graphiques »): its message above, bars
 * from zero labelled with their value, and the values in a table for screen readers, the drawing
 * being hidden from them. Days of several weeks are drawn one week under the other, each named
 * above its days: side by side, their values would cover each other on a phone. Categories of
 * several series carry a legend. A value missing for a category is refused, never drawn as zero.
 */
function BarChart({ message, orientation, categoryLabel, categories, series, unit, format = String, className }: BarChartProps) {
  const id = React.useId();
  for (const { label, values } of series) {
    if (values.length !== categories.length) {
      throw new Error(`${label}: ${String(values.length)} value${values.length > 1 ? 's' : ''} for ${String(categories.length)} categories`);
    }
  }
  const max = Math.max(0, ...series.flatMap((s) => s.values));
  const share = (value: number) => (max === 0 ? 0 : value / max);
  const order = categories.map((_, index) => index);
  if (orientation === 'horizontal') order.sort((a, b) => (series[0].values[b] ?? 0) - (series[0].values[a] ?? 0));
  const value = (seriesIndex: number, categoryIndex: number) => series[seriesIndex]?.values[categoryIndex] ?? 0;

  return (
    <figure className={cn('flex flex-col gap-3', className)}>
      <figcaption id={id} className="font-bold text-foreground">
        {message}
      </figcaption>
      {unit !== undefined && <p className="-mt-2 text-sm text-muted-foreground">En {unit}</p>}
      {orientation === 'horizontal' && series.length > 1 && (
        <ul data-legend="" aria-hidden="true" className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
          {series.map((s, j) => (
            <li key={s.label} className="flex items-center gap-2">
              <span className={cn('size-3 shrink-0 rounded-sm', SWATCHES[j])} />
              <span>{s.label}</span>
            </li>
          ))}
        </ul>
      )}
      {orientation === 'vertical' ? (
        series.length === 1 ? (
          <Days categories={categories} values={series[0].values} share={share} format={format} fill={FILLS[0]} />
        ) : (
          <div aria-hidden="true" className="flex flex-col gap-4">
            {series.map((s, j) => (
              <div key={s.label} className="flex flex-col gap-1">
                <p className="text-sm font-bold text-foreground" data-series-title="">
                  {s.label}
                </p>
                <Days categories={categories} values={s.values} share={share} format={format} fill={FILLS[j] ?? FILLS[0]} />
              </div>
            ))}
          </div>
        )
      ) : (
        <div aria-hidden="true" className="flex flex-col gap-3">
          {order.map((i) => (
            <div key={categories[i]} className="flex flex-col gap-1">
              <span className="text-sm text-foreground">{categories[i]}</span>
              {series.map((s, j) => {
                const length = share(value(j, i)) * 100;
                // The margin keeps room for the value after the longest bar, inside the card.
                return (
                  <div key={s.label} className="mr-24">
                    <svg focusable="false" className="h-6 w-full overflow-visible">
                      <rect className={FILLS[j]} x="0%" width={percent(length)} y="0%" height="100%" />
                      <text x={percent(length)} y="50%" dx="0.5em" dominantBaseline="central" className="fill-foreground text-xs tabular-nums">
                        {format(value(j, i))}
                      </text>
                    </svg>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
      {/* On its own, a table grows to its content past the 1 px of sr-only. */}
      <div className="sr-only">
        <table aria-labelledby={id}>
          <thead>
            <tr>
              <th scope="col">{categoryLabel}</th>
              {series.map((s) => (
                <th key={s.label} scope="col">
                  {unit === undefined ? s.label : `${s.label} (${unit})`}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {order.map((i) => (
              <tr key={categories[i]}>
                <th scope="row">{categories[i]}</th>
                {series.map((s, j) => (
                  <td key={s.label}>{format(value(j, i))}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </figure>
  );
}

interface DaysProps {
  categories: readonly string[];
  values: readonly number[];
  share: (value: number) => number;
  format: (value: number) => string;
  fill: string;
}

/** One series in columns, a value over each bar, the categories under them. */
function Days({ categories, values, share, format, fill }: DaysProps) {
  const column = 100 / categories.length;
  return (
    <svg aria-hidden="true" focusable="false" className="h-48 w-full overflow-visible">
      <line x1="0%" x2="100%" y1={percent(BASELINE)} y2={percent(BASELINE)} className="stroke-input" />
      {categories.map((category, i) => {
        const length = share(values[i] ?? 0) * (BASELINE - PLOT_TOP);
        const center = i * column + column / 2;
        return (
          <g key={category}>
            <rect
              className={fill}
              y={percent(BASELINE - length)}
              height={percent(length)}
              x={percent(center - (column * BAR_SHARE) / 2)}
              width={percent(column * BAR_SHARE)}
            />
            <text x={percent(center)} y={percent(BASELINE - length)} dy="-0.4em" textAnchor="middle" className="fill-foreground text-xs tabular-nums">
              {format(values[i] ?? 0)}
            </text>
            <text x={percent(center)} y="100%" dy="-0.3em" textAnchor="middle" className="fill-muted-foreground text-sm">
              {category}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export { BarChart };
