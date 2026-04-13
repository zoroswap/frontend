import { ThemeContext } from '@/providers/ThemeContext';
import {
  CandlestickSeries,
  ColorType,
  CrosshairMode,
  HistogramSeries,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp,
  createChart,
} from 'lightweight-charts';
import { useContext, useEffect, useMemo, useRef } from 'react';

export type TradingViewCandle = {
  time: UTCTimestamp;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
};

export function TradingViewCandlesChart({
  candles,
  height = 256,
  className,
}: {
  candles: TradingViewCandle[];
  height?: number;
  className?: string;
}) {
  const { theme } = useContext(ThemeContext);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);

  const isDark = useMemo(() => {
    if (theme === 'dark') return true;
    if (theme === 'light') return false;
    return document.documentElement.classList.contains('dark');
  }, [theme]);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;

    const bg = isDark ? '#131722' : '#ffffff';
    const fg = isDark ? '#d1d4dc' : '#1f2937';
    const grid = isDark ? 'rgba(42, 46, 57, 0.6)' : 'rgba(229, 231, 235, 0.8)';
    const border = isDark ? 'rgba(42, 46, 57, 0.9)' : 'rgba(229, 231, 235, 1)';

    const chart = createChart(el, {
      height,
      layout: {
        background: { type: ColorType.Solid, color: bg },
        textColor: fg,
        fontFamily: 'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial',
        fontSize: 12,
      },
      grid: {
        vertLines: { color: grid },
        horzLines: { color: grid },
      },
      rightPriceScale: {
        borderColor: border,
      },
      timeScale: {
        borderColor: border,
        timeVisible: true,
        secondsVisible: false,
      },
      crosshair: {
        mode: CrosshairMode.Magnet,
        vertLine: {
          color: isDark ? 'rgba(122, 146, 202, 0.45)' : 'rgba(37, 99, 235, 0.25)',
          width: 1,
          style: 0,
          labelBackgroundColor: isDark ? '#1f2a44' : '#2563eb',
        },
        horzLine: {
          color: isDark ? 'rgba(122, 146, 202, 0.45)' : 'rgba(37, 99, 235, 0.25)',
          width: 1,
          style: 0,
          labelBackgroundColor: isDark ? '#1f2a44' : '#2563eb',
        },
      },
      handleScroll: true,
      handleScale: true,
    });

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: isDark ? '#22c55e' : '#16a34a',
      downColor: isDark ? '#ef4444' : '#dc2626',
      borderUpColor: isDark ? '#22c55e' : '#16a34a',
      borderDownColor: isDark ? '#ef4444' : '#dc2626',
      wickUpColor: isDark ? '#22c55e' : '#16a34a',
      wickDownColor: isDark ? '#ef4444' : '#dc2626',
    });

    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: 'volume' },
      priceScaleId: '',
      color: isDark ? 'rgba(78, 140, 255, 0.35)' : 'rgba(37, 99, 235, 0.25)',
      base: 0,
    });

    volumeSeries.priceScale().applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 },
    });

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;
    volumeSeriesRef.current = volumeSeries;

    const resize = () => {
      if (!rootRef.current || !chartRef.current) return;
      const w = rootRef.current.clientWidth;
      chartRef.current.applyOptions({ width: w, height });
    };
    resize();

    const ro = new ResizeObserver(() => resize());
    ro.observe(el);

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
      volumeSeriesRef.current = null;
    };
  }, [height, isDark]);

  useEffect(() => {
    if (!candleSeriesRef.current || !volumeSeriesRef.current) return;
    if (!candles?.length) {
      candleSeriesRef.current.setData([]);
      volumeSeriesRef.current.setData([]);
      return;
    }

    candleSeriesRef.current.setData(
      candles.map(c => ({
        time: c.time,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      })),
    );

    volumeSeriesRef.current.setData(
      candles.map(c => {
        const up = c.close >= c.open;
        return {
          time: c.time,
          value: c.volume ?? 0,
          color: up
            ? (isDark ? 'rgba(34,197,94,0.35)' : 'rgba(22,163,74,0.25)')
            : (isDark ? 'rgba(239,68,68,0.35)' : 'rgba(220,38,38,0.25)'),
        };
      }),
    );

    chartRef.current?.timeScale().fitContent();
  }, [candles, isDark]);

  return (
    <div
      className={className}
      ref={rootRef}
      style={{ width: '100%', height }}
    />
  );
}

