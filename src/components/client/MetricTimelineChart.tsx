import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { Activity, Filter } from 'lucide-react';
import { ProgressMetric } from '@/lib/types/progress';

interface MetricTimelineChartProps {
  metrics: ProgressMetric[];
  title?: string;
}

export const MetricTimelineChart: React.FC<MetricTimelineChartProps> = ({ 
  metrics,
  title = "Metric Trends"
}) => {
  // Get unique metric names for the dropdown
  const metricNames = useMemo(() => {
    return Array.from(new Set(metrics.map(m => m.metric_name))).sort();
  }, [metrics]);

  const [selectedMetric, setSelectedMetric] = useState<string>(metricNames[0] || '');

  // Update selected metric if the list changes and current selection is invalid
  React.useEffect(() => {
    if (metricNames.length > 0 && !metricNames.includes(selectedMetric)) {
      setSelectedMetric(metricNames[0]);
    }
  }, [metricNames, selectedMetric]);

  // Filter data for the chart
  const chartData = useMemo(() => {
    if (!selectedMetric) return [];

    const filtered = metrics
      .filter(m => m.metric_name === selectedMetric)
      .sort((a, b) => new Date(a.session_date).getTime() - new Date(b.session_date).getTime());

    return filtered.map(m => ({
      date: m.session_date,
      dateFormatted: format(new Date(m.session_date), 'MMM dd'),
      value: m.value,
      unit: m.unit,
      max: m.max_value,
      notes: m.notes
    }));
  }, [metrics, selectedMetric]);

  const currentMetricInfo = useMemo(() => {
    return metrics.find(m => m.metric_name === selectedMetric);
  }, [metrics, selectedMetric]);

  if (metrics.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12 text-muted-foreground">
          No metrics available to chart.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <Activity className="h-4 w-4" />
          {title}
        </CardTitle>
        <div className="w-[200px]">
          <Select value={selectedMetric} onValueChange={setSelectedMetric}>
            <SelectTrigger className="h-8">
              <SelectValue placeholder="Select metric" />
            </SelectTrigger>
            <SelectContent>
              {metricNames.map(name => (
                <SelectItem key={name} value={name}>{name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis 
                  dataKey="dateFormatted" 
                  tick={{ fontSize: 12 }} 
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis 
                  domain={[0, (dataMax: number) => Math.max(dataMax, currentMetricInfo?.max_value || 10)]}
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                  width={30}
                />
                <Tooltip 
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-background border rounded-lg shadow-lg p-3 text-sm">
                          <p className="font-medium mb-1">{label}</p>
                          <p className="text-primary font-bold">
                            {data.value} <span className="text-muted-foreground font-normal">{data.unit}</span>
                          </p>
                          {data.notes && <p className="text-xs text-muted-foreground mt-1 max-w-[200px]">{data.notes}</p>}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <ReferenceLine y={currentMetricInfo?.max_value} stroke="#e5e7eb" strokeDasharray="3 3" />
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#2563eb" 
                  strokeWidth={2}
                  dot={{ r: 4, fill: "#2563eb", strokeWidth: 2, stroke: "#fff" }}
                  activeDot={{ r: 6, fill: "#2563eb" }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
              Select a metric to view trends
            </div>
          )}
        </div>
        <div className="flex justify-center mt-2 gap-4 text-xs text-muted-foreground">
            {currentMetricInfo && (
                <>
                <span>Unit: {currentMetricInfo.unit}</span>
                <span>Max: {currentMetricInfo.max_value}</span>
                </>
            )}
        </div>
      </CardContent>
    </Card>
  );
};


