// BUILD 3 snapshot
// src/App.tsx
import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Button,
  TextField,
  Autocomplete,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Paper,
  Switch,
  FormControlLabel
} from '@mui/material';

type Hole = { number: number; par: number; handicap: number };

type Course = {
  id: string;
  name: string;
  holes: Hole[];
  metadata: { totalPar: number; slope: number; rating: number; location: string };
};

interface Player {
  id: string;
  name: string;
  handicap: number;
  scores: Record<number | string, number>;
  selectedTens: number[];
}

const augustaPlaceholder: Course = {
  id: 'augusta',
  name: 'Augusta National Golf Club',
  holes: [
    { number: 1, par: 4, handicap: 9 },
    { number: 2, par: 5, handicap: 1 },
    { number: 3, par: 4, handicap: 13 },
    { number: 4, par: 3, handicap: 15 },
    { number: 5, par: 4, handicap: 5 },
    { number: 6, par: 3, handicap: 17 },
    { number: 7, par: 4, handicap: 11 },
    { number: 8, par: 5, handicap: 3 },
    { number: 9, par: 4, handicap: 7 },
    { number: 10, par: 4, handicap: 6 },
    { number: 11, par: 4, handicap: 8 },
    { number: 12, par: 3, handicap: 18 },
    { number: 13, par: 5, handicap: 4 },
    { number: 14, par: 4, handicap: 14 },
    { number: 15, par: 5, handicap: 2 },
    { number: 16, par: 3, handicap: 16 },
    { number: 17, par: 4, handicap: 12 },
    { number: 18, par: 4, handicap: 10 }
  ],
  metadata: { totalPar: 72, slope: 155, rating: 78.1, location: 'Augusta, GA' }
};

export default function App() {
  const [players, setPlayers] = useState<Player[]>([
    { id: Date.now().toString(), name: '', handicap: 0, scores: {}, selectedTens: [] }
  ]);
  const [course, setCourse] = useState<Course | null>(null);
  const [searchInput, setSearchInput] = useState<string>('');
  const [options, setOptions] = useState<Course[]>([]);
  const [playTens, setPlayTens] = useState<boolean>(false);

  useEffect(() => {
    let active = true;
    (async () => {
      if (searchInput.length < 2) {
        setOptions([]);
        return;
      }
      try {
        const res = await fetch(
          `https://api.golfcourseapi.com/courses/search?keyword=${encodeURIComponent(searchInput)}`,
          { headers: { Authorization: 'Key VLNANFMEVIQBJ6T75A52WMQUKI' } }
        );
        const data = await res.json();
        if (active) setOptions(data.courses || []);
      } catch {
        setOptions([]);
      }
    })();
    return () => { active = false; };
  }, [searchInput]);

  const fetchCourseById = async (id: string) => {
    try {
      const res = await fetch(`https://api.golfcourseapi.com/courses/${id}`, {
        headers: { Authorization: 'Key VLNANFMEVIQBJ6T75A52WMQUKI' }
      });
      if (!res.ok) throw new Error('API error');
      const data: Course = await res.json();
      setCourse(data);
    } catch {
      setCourse(augustaPlaceholder);
    }
  };

  const useAugustaCourse = () => setCourse(augustaPlaceholder);

  const addPlayer = () => {
    if (players.length < 4) {
      setPlayers([...players, { id: Date.now().toString(), name: '', handicap: 0, scores: {}, selectedTens: [] }]);
    }
  };

  const updatePlayer = (id: string, updates: Partial<Player>) => {
    setPlayers(players.map(p => p.id === id ? { ...p, ...updates } : p));
  };

  const getStrokes = (playerHandicap: number, holeHandicap: number) => {
    if (!course) return 0;
    const totalHoles = course.holes.length;
    const base = Math.floor(playerHandicap / totalHoles);
    const remain = playerHandicap % totalHoles;
    const extra = holeHandicap <= remain ? 1 : 0;
    return base + extra;
  };

  const handleScoreChange = (pid: string, holeNumber: number, gross: number, handicap: number) => {
    if (!course) return;
    const allowance = getStrokes(handicap, course.holes.find(h => h.number === holeNumber)!.handicap);
    const net = gross - allowance;
    setPlayers(players.map(pl => pl.id === pid
      ? { ...pl, scores: { ...pl.scores, [holeNumber]: gross, [`net_${holeNumber}`]: net } }
      : pl
    ));
  };

  const toggleTenHole = (pid: string, hole: number) => {
    setPlayers(players.map(pl => {
      if (pl.id !== pid) return pl;
      const selected = new Set(pl.selectedTens);
      if (selected.has(hole)) selected.delete(hole);
      else if (selected.size < 10) selected.add(hole);
      return { ...pl, selectedTens: Array.from(selected) };
    }));
  };

  return (
    <Container sx={{ py: 4 }}>
      <Box component={Paper} sx={{ p: 2, mb: 4 }}>
        <Typography variant="h6">Players</Typography>
        {players.map((pl, i) => (
          <Box key={pl.id} sx={{ display: 'flex', gap: 2, mb: 1 }}>
            <TextField label={`Player ${i + 1}`} value={pl.name} onChange={e => updatePlayer(pl.id, { name: e.target.value })} />
            <TextField label="Handicap" type="number" value={pl.handicap} onChange={e => updatePlayer(pl.id, { handicap: +e.target.value })} sx={{ width: 100 }} />
          </Box>
        ))}
        <Button variant="contained" onClick={addPlayer} disabled={players.length >= 4}>Add Player</Button>
      </Box>

      <Box component={Paper} sx={{ p: 2, mb: 4 }}>
        <Typography variant="h6">Course Search</Typography>
        <Autocomplete
          value={course}
          options={options}
          getOptionLabel={opt => opt.name}
          onInputChange={(_, v) => setSearchInput(v)}
          onChange={(_, v) => v && fetchCourseById(v.id)}
          renderInput={params => <TextField {...params} label="Search Course" fullWidth />}
        />
        <Button variant="outlined" sx={{ mt: 2 }} onClick={useAugustaCourse}>Use Augusta</Button>
        <FormControlLabel control={<Switch checked={playTens} onChange={e => setPlayTens(e.target.checked)} />} label="Play 10s?" sx={{ mt: 2, ml: 2 }} />
      </Box>

      {course && (
        <>
          <Typography variant="h4" gutterBottom>Golf Score Tracker</Typography>
          <Table component={Paper} sx={{ mt: 2 }}>
            <TableHead>
              <TableRow>
                <TableCell>Player</TableCell>
                {course.holes.map(h => (<TableCell key={h.number} sx={{ height: 50 }}>{h.number}</TableCell>))}
                <TableCell sx={{ height: 50 }}>Front 9</TableCell>
                <TableCell sx={{ height: 50 }}>Back 9</TableCell>
                <TableCell sx={{ height: 50 }}>Total</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Hcp</TableCell>
                {course.holes.map(h => (<TableCell key={h.number}>{h.handicap}</TableCell>))}
                <TableCell />
                <TableCell />
                <TableCell />
              </TableRow>
              <TableRow>
                <TableCell>Par</TableCell>
                {course.holes.map(h => (<TableCell key={h.number}>{h.par}</TableCell>))}
                <TableCell>{course.holes.slice(0, 9).reduce((sum, h) => sum + h.par, 0)}</TableCell>
                <TableCell>{course.holes.slice(9).reduce((sum, h) => sum + h.par, 0)}</TableCell>
                <TableCell>{course.metadata.totalPar}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {players.map(pl => {
                const frontGross = course.holes.slice(0, 9).reduce((sum, h) => sum + (pl.scores[h.number] || 0), 0);
                const backGross = course.holes.slice(9).reduce((sum, h) => sum + (pl.scores[h.number] || 0), 0);
                const totalGross = frontGross + backGross;
                const frontStrokes = course.holes.slice(0, 9).reduce((sum, h) => sum + getStrokes(pl.handicap, h.handicap), 0);
                const backStrokes = course.holes.slice(9).reduce((sum, h) => sum + getStrokes(pl.handicap, h.handicap), 0);
                const totalStrokes = frontStrokes + backStrokes;
                const frontNet = course.holes.slice(0, 9).reduce((sum, h) => sum + (pl.scores[`net_${h.number}`] || 0), 0);
                const backNet = course.holes.slice(9).reduce((sum, h) => sum + (pl.scores[`net_${h.number}`] || 0), 0);
                const totalNet = frontNet + backNet;
                return (
                  <TableRow key={pl.id}>
                    <TableCell>{pl.name || '—'}</TableCell>
                    {course.holes.map(h => {
                      const strokes = getStrokes(pl.handicap, h.handicap);
                      return (
                        <TableCell key={h.number} sx={{ p: 0.5, textAlign: 'center' }}>
                          <Typography variant="caption">+{strokes}</Typography>
                          <Box sx={{ width: 40, height: 50, mx: 'auto', border: '1px solid', borderColor: 'grey.400', borderRadius: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <input
                              type="text"
                              inputMode="numeric"
                              pattern="[0-9]*"
                              value={pl.scores[h.number] || ''}
                              onChange={e => handleScoreChange(pl.id, h.number, +e.target.value, pl.handicap)}
                              style={{ width: '100%', height: '100%', textAlign: 'center', border: 'none', outline: 'none', fontSize: '1rem' }}
                            />
                          </Box>
                          <Typography variant="caption">Net: {pl.scores[`net_${h.number}`] || ''}</Typography>
                          <Button
                            size="small"
                            variant={pl.selectedTens.includes(h.number) ? 'contained' : 'outlined'}
                            onClick={() => toggleTenHole(pl.id, h.number)}
                            sx={{ mt: 0.5, visibility: playTens ? 'visible' : 'hidden' }}
                          >10</Button>
                        </TableCell>
                      );
                    })}
                    {[
                      { strokes: frontStrokes, gross: frontGross, net: frontNet },
                      { strokes: backStrokes, gross: backGross, net: backNet },
                      { strokes: totalStrokes, gross: totalGross, net: totalNet }
                    ].map((sec, idx) => (
                      <TableCell key={idx} sx={{ p: 0.5, textAlign: 'center' }}>
                        <Typography variant="caption">+{sec.strokes}</Typography>
                        <Box sx={{ width: 40, height: 50, mx: 'auto', border: '1px solid', borderColor: 'grey.400', borderRadius: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Typography sx={{ fontSize: '1rem' }}>{sec.gross}</Typography>
                        </Box>
                        <Typography variant="caption">Net: {sec.net}</Typography>
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          {playTens && course && (
            <Box component={Paper} sx={{ p: 2, mt: 4 }}>
              <Typography variant="h6">Game of 10s</Typography>
              {players.map(pl => (
                <Box key={pl.id} sx={{ mb: 2 }}>
                  <Typography>{pl.name}</Typography>
                  <Typography>Selected: {pl.selectedTens.length}/10</Typography>
                  <Typography>
                    Total Score: {pl.selectedTens.reduce((sum, h) => sum + (pl.scores[`net_${h}`] || 0), 0)}
                    {' (Over/Under Par: '}
                    {pl.selectedTens.reduce((sum, h) => sum + ((pl.scores[`net_${h}`] || 0) - course.holes.find(hole => hole.number === h)!.par), 0)}
                    )
                  </Typography>
                </Box>
              ))}
            </Box>
          )}
        </>
      )}
    </Container>
  );
}
