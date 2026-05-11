'use client';

import { FormEvent, useMemo, useState } from 'react';

type GeoResult = {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  country?: string;
  admin1?: string;
  timezone?: string;
};

type ForecastResponse = {
  current?: {
    temperature_2m: number;
    wind_speed_10m: number;
    weather_code: number;
    time: string;
  };
  hourly?: {
    time: string[];
    temperature_2m: number[];
    precipitation_probability?: number[];
    weather_code: number[];
  };
  daily?: {
    time: string[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    weather_code: number[];
  };
  timezone?: string;
};

type WeatherState = {
  location: string;
  country?: string;
  region?: string;
  timezone?: string;
  temperature: number;
  windSpeed: number;
  description: string;
  currentTime: string;
  forecast: Array<{
    time: string;
    temp: number;
    max?: number;
    min?: number;
    pop?: number;
    description: string;
  }>;
};

const WEATHER_CODES: Record<number, string> = {
  0: 'Clear sky',
  1: 'Mainly clear',
  2: 'Partly cloudy',
  3: 'Overcast',
  45: 'Fog',
  48: 'Depositing rime fog',
  51: 'Light drizzle',
  53: 'Moderate drizzle',
  55: 'Dense drizzle',
  56: 'Freezing drizzle',
  57: 'Freezing drizzle',
  61: 'Slight rain',
  63: 'Moderate rain',
  65: 'Heavy rain',
  66: 'Freezing rain',
  67: 'Freezing rain',
  71: 'Slight snow fall',
  73: 'Moderate snow fall',
  75: 'Heavy snow fall',
  77: 'Snow grains',
  80: 'Rain showers',
  81: 'Rain showers',
  82: 'Violent rain showers',
  85: 'Snow showers',
  86: 'Heavy snow showers',
  95: 'Thunderstorm',
  96: 'Thunderstorm with hail',
  99: 'Thunderstorm with hail',
};

function getWeatherText(code?: number) {
  return code === undefined ? 'Unknown' : WEATHER_CODES[code] ?? 'Unknown';
}

function formatDayLabel(iso: string) {
  const date = new Date(iso);
  return new Intl.DateTimeFormat('en', { weekday: 'short', month: 'short', day: 'numeric' }).format(date);
}

function formatHourLabel(iso: string) {
  const date = new Date(iso);
  return new Intl.DateTimeFormat('en', { hour: 'numeric' }).format(date);
}

export default function WeatherPage() {
  const [query, setQuery] = useState('Dhanbad');
  const [state, setState] = useState<WeatherState | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const heroGradient = useMemo(
    () => 'bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.22),_transparent_42%),linear-gradient(180deg,_rgba(15,23,42,1)_0%,_rgba(2,6,23,1)_100%)]',
    [],
  );

  async function handleSearch(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const term = query.trim();
    if (!term) {
      setError('Type a city, town, or place name.');
      return;
    }

    setLoading(true);
    setError('');
    setState(null);

    try {
      const geoRes = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(term)}&count=1&language=en&format=json`,
      );
      if (!geoRes.ok) throw new Error('Could not find that location.');
      const geoData: { results?: GeoResult[] } = await geoRes.json();
      const place = geoData.results?.[0];
      if (!place) throw new Error('No matching location found.');

      const forecastRes = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}&current=temperature_2m,weather_code,wind_speed_10m&hourly=temperature_2m,precipitation_probability,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto`,
      );
      if (!forecastRes.ok) throw new Error('Weather data is unavailable right now.');
      const weather: ForecastResponse = await forecastRes.json();

      const hourlyTimes = weather.hourly?.time ?? [];
      const hourlyTemps = weather.hourly?.temperature_2m ?? [];
      const hourlyPop = weather.hourly?.precipitation_probability ?? [];
      const hourlyCodes = weather.hourly?.weather_code ?? [];

      const nextForecast = hourlyTimes.slice(0, 6).map((time, idx) => ({
        time,
        temp: hourlyTemps[idx],
        pop: hourlyPop[idx],
        description: getWeatherText(hourlyCodes[idx]),
      }));

      const dailyTimes = weather.daily?.time ?? [];
      const dailyMax = weather.daily?.temperature_2m_max ?? [];
      const dailyMin = weather.daily?.temperature_2m_min ?? [];
      const dailyCodes = weather.daily?.weather_code ?? [];

      const dailyForecast = dailyTimes.slice(0, 5).map((time, idx) => ({
        time,
        temp: dailyMax[idx],
        max: dailyMax[idx],
        min: dailyMin[idx],
        description: getWeatherText(dailyCodes[idx]),
      }));

      setState({
        location: place.name,
        country: place.country,
        region: place.admin1,
        timezone: weather.timezone ?? place.timezone,
        temperature: weather.current?.temperature_2m ?? hourlyTemps[0] ?? 0,
        windSpeed: weather.current?.wind_speed_10m ?? 0,
        description: getWeatherText(weather.current?.weather_code),
        currentTime: weather.current?.time ?? hourlyTimes[0] ?? new Date().toISOString(),
        forecast: [...nextForecast, ...dailyForecast],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className={`min-h-screen text-slate-100 ${heroGradient}`}>
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
        <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl shadow-sky-950/30 backdrop-blur md:p-8">
          <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-sky-300/90">Weather App</p>
              <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
                Search any city and see the forecast instantly.
              </h1>
              <p className="mt-4 max-w-2xl text-slate-300">
                Built with Next.js and the Open-Meteo API. No API key required.
              </p>

              <form onSubmit={handleSearch} className="mt-6 flex flex-col gap-3 sm:flex-row">
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Enter city name"
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none ring-0 placeholder:text-slate-400 focus:border-sky-400"
                />
                <button
                  type="submit"
                  className="rounded-2xl bg-sky-500 px-5 py-3 font-medium text-white transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={loading}
                >
                  {loading ? 'Searching…' : 'Get weather'}
                </button>
              </form>

              {error ? <p className="mt-4 text-sm text-rose-300">{error}</p> : null}
            </div>

            <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
              <StatCard label="Current weather" value={state?.description ?? 'Ready'} />
              <StatCard label="Temperature" value={state ? `${Math.round(state.temperature)}°C` : '--'} />
              <StatCard label="Wind speed" value={state ? `${Math.round(state.windSpeed)} km/h` : '--'} />
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-3xl border border-white/10 bg-slate-950/50 p-6 shadow-xl shadow-black/20 backdrop-blur">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-slate-400">Current location</p>
                <h2 className="mt-1 text-2xl font-semibold">
                  {state ? `${state.location}${state.region ? `, ${state.region}` : ''}` : 'No location loaded'}
                </h2>
                <p className="mt-1 text-slate-300">
                  {state ? `${state.country ?? ''} • ${state.timezone ?? 'Local timezone'}` : 'Search for a city to load the forecast.'}
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-right">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Updated</p>
                <p className="mt-1 text-sm text-white">{state ? new Date(state.currentTime).toLocaleString() : '—'}</p>
              </div>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <BigMetric label="Temperature" value={state ? `${Math.round(state.temperature)}°C` : '--'} />
              <BigMetric label="Wind" value={state ? `${Math.round(state.windSpeed)} km/h` : '--'} />
              <BigMetric label="Condition" value={state?.description ?? '--'} />
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl shadow-black/20 backdrop-blur">
            <h3 className="text-xl font-semibold">Forecast</h3>
            <div className="mt-4 space-y-3">
              {state?.forecast?.length ? (
                state.forecast.map((item, index) => (
                  <div key={`${item.time}-${index}`} className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3">
                    <div>
                      <p className="font-medium text-white">
                        {index < 6 ? formatHourLabel(item.time) : formatDayLabel(item.time)}
                      </p>
                      <p className="text-sm text-slate-400">{item.description}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-white">
                        {item.max !== undefined ? `${Math.round(item.max)}° / ${Math.round(item.min ?? item.temp)}°` : `${Math.round(item.temp)}°C`}
                      </p>
                      {item.pop !== undefined ? <p className="text-sm text-slate-400">Rain {item.pop}%</p> : null}
                    </div>
                  </div>
                ))
              ) : (
                <p className="rounded-2xl border border-dashed border-white/10 px-4 py-8 text-center text-slate-400">
                  Your hourly and daily forecast will appear here.
                </p>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/45 p-4 shadow-lg shadow-black/10">
      <p className="text-sm text-slate-400">{label}</p>
      <p className="mt-2 text-xl font-semibold text-white">{value}</p>
    </div>
  );
}

function BigMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
      <p className="text-sm text-slate-400">{label}</p>
      <p className="mt-2 text-lg font-semibold text-white">{value}</p>
    </div>
  );
}
