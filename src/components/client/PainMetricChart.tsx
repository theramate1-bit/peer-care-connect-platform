import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { AlertTriangle } from 'lucide-react';
import { ProgressMetric } from '@/lib/types/progress';

interface PainMetricChartProps {
  metrics: ProgressMetric[];
}

export const PainMetricChart: React.FC<PainMetricChartProps> = ({ metrics }) => {
  // Filter only pain_level metrics
  const painMetrics = useMemo(() => {
    return metrics.filter(m => m.metric_type === 'pain_level');
  }, [metrics]);

  // Get unique pain metric names
  const painMetricNames = useMemo(() => {
    return Array.from(new Set(painMetrics.map(m => m.metric_name))).sort();
  }, [painMetrics]);

  const [selectedMetric, setSelectedMetric] = useState<string>(painMetricNames[0] || '');

  React.useEffect(() => {
    if (painMetricNames.length > 0 && !painMetricNames.includes(selectedMetric)) {
      setSelectedMetric(painMetricNames[0]);
    }
  }, [painMetricNames, selectedMetric]);

  // Filter data for the chart
  const chartData = useMemo(() => {
    if (!selectedMetric) return [];

    const filtered = painMetrics
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
  }, [painMetrics, selectedMetric]);

  const currentMetricInfo = useMemo(() => {
    return painMetrics.find(m => m.metric_name === selectedMetric);
  }, [painMetrics, selectedMetric]);

  if (painMetrics.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            Pain Level Metrics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-sm">No pain level metrics recorded yet</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-red-600" />
          Pain Level Metrics
        </CardTitle>
        {painMetricNames.length > 1 && (
          <div className="w-[200px]">
            <Select value={selectedMetric} onValueChange={setSelectedMetric}>
              <SelectTrigger className="h-8">
                <SelectValue placeholder="Select metric" />
              </SelectTrigger>
              <SelectContent>
                {painMetricNames.map(name => (
                  <SelectItem key={name} value={name}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </CardHeader>
          <CardContent>
            <div className="h-[200px] w-full">
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
                  domain={[0, 10]}
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                  width={30}
                  label={{ value: 'Pain Level (VAS)', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip 
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-background border rounded-lg shadow-lg p-3 text-sm">
                          <p className="font-medium mb-1">{label}</p>
                          <p className="text-red-600 font-bold">
                            {data.value} <span className="text-muted-foreground font-normal">/10</span>
                          </p>
                          {data.notes && <p className="text-xs text-muted-foreground mt-1 max-w-[200px]">{data.notes}</p>}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#ef4444" 
                  strokeWidth={2}
                  dot={{ r: 4, fill: "#ef4444", strokeWidth: 2, stroke: "#fff" }}
                  activeDot={{ r: 6, fill: "#ef4444" }}
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
              <span>Scale: 0-10 (VAS)</span>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

