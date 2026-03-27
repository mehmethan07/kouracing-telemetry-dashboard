'use client';

import { memo, useEffect, useState, useCallback } from 'react';
import { Cloud, Droplets, Wind, Thermometer, Eye, RefreshCw, MapPin } from 'lucide-react';
import styles from './WeatherWidget.module.css';

interface WeatherData {
  temp: number;
  humidity: number;
  windSpeed: number;
  windDir: string;
  condition: string;
  icon: string;
  visibility: number;
  feelsLike: number;
  city: string;
}

function WeatherWidgetComponent() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [city] = useState('Kocaeli');

  const fetchWeather = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      // Using wttr.in - no API key needed
      const res = await fetch(`https://wttr.in/${encodeURIComponent(city)}?format=j1`);
      if (!res.ok) throw new Error('Weather fetch failed');
      const data = await res.json();
      const current = data.current_condition[0];

      setWeather({
        temp: parseFloat(current.temp_C),
        humidity: parseFloat(current.humidity),
        windSpeed: parseFloat(current.windspeedKmph),
        windDir: current.winddir16Point,
        condition: current.weatherDesc[0].value,
        icon: current.weatherIconUrl?.[0]?.value || '',
        visibility: parseFloat(current.visibility),
        feelsLike: parseFloat(current.FeelsLikeC),
        city: data.nearest_area?.[0]?.areaName?.[0]?.value || city,
      });
    } catch {
      setError('Could not fetch weather data');
    } finally {
      setLoading(false);
    }
  }, [city]);

  useEffect(() => {
    fetchWeather();
    const interval = setInterval(fetchWeather, 600000); // Update every 10 minutes
    return () => clearInterval(interval);
  }, [fetchWeather]);

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <Cloud size={16} /> WEATHER
          <button className={styles.retryBtn} onClick={fetchWeather}><RefreshCw size={12} /></button>
        </div>
        <div className={styles.error}>{error}</div>
      </div>
    );
  }

  if (!weather || loading) {
    return (
      <div className={styles.container}>
        <div className={styles.header}><Cloud size={16} /> WEATHER</div>
        <div className={styles.loading}>Loading...</div>
      </div>
    );
  }

  // Track condition assessment
  const getTrackCondition = () => {
    const cond = weather.condition.toLowerCase();
    if (cond.includes('rain') || cond.includes('drizzle') || cond.includes('shower'))
      return { label: 'WET', color: 'var(--status-danger)' };
    if (cond.includes('cloud') || cond.includes('overcast'))
      return { label: 'OVERCAST', color: 'var(--status-warning)' };
    return { label: 'DRY', color: 'var(--status-ok)' };
  };

  const trackCondition = getTrackCondition();

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <Cloud size={16} />
          <span>WEATHER</span>
        </div>
        <div className={styles.headerRight}>
          <div className={styles.trackBadge} style={{ borderColor: trackCondition.color, color: trackCondition.color }}>
            {trackCondition.label}
          </div>
          <button className={styles.retryBtn} onClick={fetchWeather}>
            <RefreshCw size={12} />
          </button>
        </div>
      </div>

      <div className={styles.location}>
        <MapPin size={12} /> {weather.city}
      </div>

      <div className={styles.mainTemp}>
        <span className={styles.tempValue}>{Math.round(weather.temp)}</span>
        <span className={styles.tempUnit}>°C</span>
      </div>

      <div className={styles.condition}>{weather.condition}</div>

      <div className={styles.details}>
        <div className={styles.detailItem}>
          <Thermometer size={13} />
          <span>Feels {Math.round(weather.feelsLike)}°C</span>
        </div>
        <div className={styles.detailItem}>
          <Droplets size={13} />
          <span>{weather.humidity}%</span>
        </div>
        <div className={styles.detailItem}>
          <Wind size={13} />
          <span>{weather.windSpeed} km/h {weather.windDir}</span>
        </div>
        <div className={styles.detailItem}>
          <Eye size={13} />
          <span>{weather.visibility} km</span>
        </div>
      </div>
    </div>
  );
}

const WeatherWidget = memo(WeatherWidgetComponent);
export default WeatherWidget;
