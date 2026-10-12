import { describe, expect, it } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { BarChart } from './bar-chart';

const DAYS = ['lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.', 'dim.'];

function bars(html: string) {
  return [...html.matchAll(/<rect class="([^"]*)"[^>]*?\b(?:y|x)="([\d.]+)%"[^>]*?\b(height|width)="([\d.]+)%"/g)].map(
    ([, className, start, , length]) => ({
      className: className ?? '',
      start: Number(start),
      length: Number(length),
    }),
  );
}

function cells(html: string) {
  const body = /<tbody>(.*)<\/tbody>/.exec(html)?.[1] ?? '';
  return [...body.matchAll(/<tr>(.*?)<\/tr>/g)].map(([, row]) => [...(row ?? '').matchAll(/<t[hd][^>]*>(.*?)<\/t[hd]>/g)].map(([, cell]) => cell));
}

describe('BarChart', () => {
  it('says its message above the bars and names the table of values by it', () => {
    const html = renderToStaticMarkup(
      <BarChart
        message="Le mercredi compte le plus."
        orientation="vertical"
        categoryLabel="Jour"
        categories={DAYS}
        series={[{ label: 'Minutes', values: [10, 0, 45, 20, 5, 0, 30] }]}
      />,
    );
    const caption = /<figcaption id="([^"]+)"[^>]*>Le mercredi compte le plus.<\/figcaption>/.exec(html);
    expect(caption).not.toBeNull();
    expect(html.indexOf('<figcaption')).toBeLessThan(html.indexOf('<svg'));
    expect(html).toContain(`<table aria-labelledby="${caption?.[1] ?? ''}"`);
    expect(/<svg[^>]*aria-hidden="true"/.test(html)).toBe(true);
  });

  it('gives screen readers every value, in the order of the days, formatted', () => {
    const html = renderToStaticMarkup(
      <BarChart
        message="m"
        orientation="vertical"
        categoryLabel="Jour"
        categories={DAYS}
        series={[{ label: 'Minutes', values: [10, 0, 45, 20, 5, 0, 30] }]}
        format={(minutes) => `${String(minutes)} min`}
      />,
    );
    expect(html).toContain('<th scope="col">Jour</th><th scope="col">Minutes</th>');
    expect(cells(html)).toEqual(DAYS.map((day, i) => [day, `${String([10, 0, 45, 20, 5, 0, 30][i])} min`]));
  });

  it('draws the bars from zero, the largest across the whole plot, and labels each of them', () => {
    const html = renderToStaticMarkup(
      <BarChart
        message="m"
        orientation="vertical"
        categoryLabel="Jour"
        categories={['a', 'b', 'c']}
        series={[{ label: 'Minutes', values: [20, 0, 40] }]}
      />,
    );
    const drawn = bars(html);
    expect(drawn.map((bar) => bar.length)).toHaveLength(3);
    const [half, zero, full] = drawn;
    expect(zero?.length).toBe(0);
    expect(half?.length).toBeCloseTo((full?.length ?? 0) / 2);
    // Every bar ends on the same baseline.
    expect(new Set(drawn.map((bar) => (bar.start + bar.length).toFixed(3))).size).toBe(1);
    for (const value of ['20', '0', '40']) expect(html).toContain(`>${value}</text>`);
  });

  it('sorts the horizontal bars from the largest, in the drawing as in the table', () => {
    const html = renderToStaticMarkup(
      <BarChart
        message="m"
        orientation="horizontal"
        categoryLabel="Matière"
        categories={['Français', 'Mathématiques', 'Anglais']}
        series={[{ label: 'Minutes', values: [30, 75, 30] }]}
      />,
    );
    expect(cells(html).map(([subject]) => subject)).toEqual(['Mathématiques', 'Français', 'Anglais']);
    expect(bars(html).map((bar) => bar.length)).toEqual([...bars(html).map((bar) => bar.length)].sort((a, b) => b - a));
    expect(html.indexOf('Mathématiques')).toBeLessThan(html.indexOf('Français'));
  });

  it('colors the series chart-1 to chart-4 in their order, with a legend that names them', () => {
    const series = [
      { label: 'Cette semaine', values: [1, 2] },
      { label: 'Semaine dernière', values: [2, 3] },
      { label: 'Il y a deux semaines', values: [3, 4] },
      { label: 'Il y a trois semaines', values: [4, 5] },
    ] as const;
    const html = renderToStaticMarkup(
      <BarChart message="m" orientation="vertical" categoryLabel="Jour" categories={['lun.', 'mar.']} series={series} />,
    );
    const fills = bars(html).map((bar) => /fill-chart-\d/.exec(bar.className)?.[0]);
    expect(fills).toEqual([
      'fill-chart-1',
      'fill-chart-2',
      'fill-chart-3',
      'fill-chart-4',
      'fill-chart-1',
      'fill-chart-2',
      'fill-chart-3',
      'fill-chart-4',
    ]);
    const legend = /<ul[^>]*data-legend[^>]*>(.*?)<\/ul>/.exec(html)?.[1] ?? '';
    expect([...legend.matchAll(/<li[^>]*>.*?<span>(.*?)<\/span><\/li>/g)].map(([, label]) => label)).toEqual(series.map((s) => s.label));
  });

  it('shows no legend for a single series, whose name the table header carries', () => {
    const html = renderToStaticMarkup(
      <BarChart message="m" orientation="vertical" categoryLabel="Jour" categories={['lun.']} series={[{ label: 'Minutes', values: [5] }]} />,
    );
    expect(html).not.toContain('data-legend');
  });

  it('draws a week without any time as flat bars, never as invalid geometry', () => {
    const html = renderToStaticMarkup(
      <BarChart
        message="m"
        orientation="vertical"
        categoryLabel="Jour"
        categories={DAYS}
        series={[{ label: 'Minutes', values: DAYS.map(() => 0) }]}
      />,
    );
    expect(html).not.toContain('NaN');
    expect(bars(html).every((bar) => bar.length === 0)).toBe(true);
  });
});
