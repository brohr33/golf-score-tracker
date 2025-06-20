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
  scores: Record<string, number>;
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
  const [searchInput, setSearchInput] = useState('');
  const [options, setOptions] = useState<Course[]>([]);
  const [playTens, setPlayTens] = useState(false);

  useEffect(() => {
    let active = true;
    if (searchInput.length < 2) {
      setOptions([]);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://api.golfcourseapi.com/courses/search?keyword=${encodeURIComponent(searchInput)}`,
          { headers: { Authorization: 'Key VLNANFMEVIQBJ6T75A52WMQUKI' }, signal: controller.signal }
        );
        if (!res.ok) throw new Error(`Search error ${res.status}`);
        const data = await res.json();
        if (active) setOptions(data.courses || []);
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.error('Search failed', err);
          setOptions([]);
        }
      }
    }, 300);
    return () => {
      clearTimeout(timer);
      controller.abort();
      active = false;
    };
  }, [searchInput]);

  const fetchCourseById = async (id: string) => {
    try {
      const res = await fetch(`https://api.golfcourseapi.com/courses/${id}`, {
        headers: { Authorization: 'Key VLNANFMEVIQBJ6T75A52WMQUKI' }
      });
      if (!res.ok) throw new Error('Course not found');
      const { course: raw } = await res.json();
      const normalized: Course = {
        id: raw.id,
        name: raw.name,
        metadata: {
          totalPar: raw.holes.reduce((s: number, h: any) => s + h.par, 0),
          slope: raw.slope,
          rating: raw.rating,
          location: raw.location
        },
        holes: raw.holes.map((h: any) => ({ number: h.number, par: h.par, handicap: h.strokeIndex }))
      };
      setCourse(normalized);
    } catch (err) {
      console.error('Fetch course failed', err);
      setCourse(augustaPlaceholder);
    }
  };

  const useAugustaCourse = () => setCourse(augustaPlaceholder);

  const addPlayer = () => {
    if (players.length < 4) {
      setPlayers(prev => [...prev, { id: Date.now().toString(), name: '', handicap: 0, scores: {}, selectedTens: [] }]);
    }
  };

  const updatePlayer = (id: string, updates: Partial<Player>) => {
    setPlayers(prev => prev.map(p => (p.id === id ? { ...p, ...updates } : p)));
  };

  const getStrokes = (playerHandicap: number, holeHandicap: number) => {
    if (!course) return 0;
    const base = Math.floor(playerHandicap / course.holes.length);
    const remain = playerHandicap % course.holes.length;
    return base + (holeHandicap <= remain ? 1 : 0);
  };

  const handleScoreChange = (pid: string, holeNumber: number, gross: number) => {
    if (!course) return;
    const player = players.find(p => p.id === pid)!;
    const hole = course.holes.find(h => h.number === holeNumber)!;
    const net = gross - getStrokes(player.handicap, hole.handicap);
    setPlayers(prev => prev.map(pl => pl.id === pid
      ? { ...pl, scores: { ...pl.scores, [holeNumber]: gross, [`net_${holeNumber}`]: net } }
      : pl
    ));
  };

  const toggleTenHole = (pid: string, hole: number) => {
    setPlayers(prev => prev.map(pl => pl.id === pid
      ? { ...pl, selectedTens: pl.selectedTens.includes(hole)
          ? pl.selectedTens.filter(hn => hn !== hole)
          : pl.selectedTens.length < 10
            ? [...pl.selectedTens, hole]
            : pl.selectedTens }
      : pl
    ));
  };

  const sumRange = (arr: number[], getter: (n: number) => number) => arr.reduce((s,n) => s + getter(n), 0);

  return (
    <Container sx={{ py: 4 }}>
      {/* Players Section */}
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

      {/* Course Search Section */}
      <Box component={Paper} sx={{ p: 2, mb: 4 }}>
        <Typography variant="h6">Course Search</Typography>
        <Autocomplete
          value={course}
          options={options}
          getOptionLabel={opt => opt.name}
          onInputChange={(_,v) => setSearchInput(v)}
          onChange={(_,v) => v && fetchCourseById(v.id)}
          renderInput={params => <TextField {...params} label="Search Course" fullWidth />}  
        />
        <Button variant="outlined" sx={{ mt:2 }} onClick={useAugustaCourse}>Use Augusta</Button>
        <FormControlLabel control={<Switch checked={playTens} onChange={e => setPlayTens(e.target.checked)} />} label="Play 10s?" sx={{ mt:2, ml:2 }} />
      </Box>

      {/* Scorecard Section */}
      {course && (
        <>  
          <Typography variant="h4" gutterBottom>Golf Score Tracker</Typography>
          <Table component={Paper} sx={{ mt:2 }}>
            <TableHead>
              <TableRow>
                <TableCell>Player</TableCell>
                {course.holes.map(h => (<TableCell key={h.number} align="center">{h.number}</TableCell>))}
                <TableCell align="center">Front 9</TableCell>
                <TableCell align="center">Back 9</TableCell>
                <TableCell align="center">Total</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Hcp</TableCell>
                {course.holes.map(h => (<TableCell key={h.number} align="center">{h.handicap}</TableCell>))}
                <TableCell/> <TableCell/> <TableCell/>
              </TableRow>
              <TableRow>
                <TableCell>Par</TableCell>
                {course.holes.map(h => (<TableCell key={h.number} align="center">{h.par}</TableCell>))}
                <TableCell align="center">{course.holes.slice(0,9).reduce((sum,h)=>sum+h.par,0)}</TableCell>
                <TableCell align="center">{course.holes.slice(9).reduce((sum,h)=>sum+h.par,0)}</TableCell>
                <TableCell align="center">{course.metadata.totalPar}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
  {players.map(pl => {
    // calculate front/back/total gross & net
    const frontHoles = course.holes.slice(0, 9).map(h => h.number);
    const backHoles  = course.holes.slice(9).map(h => h.number);
    const frontGross = frontHoles.reduce((sum, n) => sum + (pl.scores[n] || 0), 0);
    const backGross  = backHoles .reduce((sum, n) => sum + (pl.scores[n] || 0), 0);
    const totalGross = frontGross + backGross;
    const frontNet   = frontHoles.reduce((sum, n) => sum + (pl.scores[`net_${n}`] || 0), 0);
    const backNet    = backHoles .reduce((sum, n) => sum + (pl.scores[`net_${n}`] || 0), 0);
    const totalNet   = frontNet + backNet;

    return (
      <TableRow key={pl.id}>
        <TableCell>{pl.name || '—'}</TableCell>

        {course.holes.map(h => {
          const strokes = getStrokes(pl.handicap, h.handicap);
          return (
            <TableCell key={h.number} align="center" sx={{ p: 0.5 }}>
              <Typography variant="caption">+{strokes}</Typography>
              <Box
                sx={{
                  width: 40,
                  height: 50,
                  mx: 'auto',
                  border: '1px solid',
                  borderColor: 'grey.400',
                  borderRadius: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <input
  type="text"
  inputMode="numeric"
  pattern="[0-9]*"
  value={pl.scores[h.number] || ''}
  onChange={e => handleScoreChange(pl.id, h.number, Number(e.target.value) || 0)}
  style={{
    width: '100%',
    height: '100%',
    lineHeight: '50px',
    textAlign: 'center',
    border: 'none',
    outline: 'none',
    fontSize: '1rem',
    padding: 0,
    boxSizing: 'border-box',
  }}
/>
              </Box>
              <Typography variant="caption">Net: {pl.scores[`net_${h.number}`] || ''}</Typography>
              <Button
                size="small"
                variant={pl.selectedTens.includes(h.number) ? 'contained' : 'outlined'}
                onClick={() => toggleTenHole(pl.id, h.number)}
                sx={{ mt: 0.5, visibility: playTens ? 'visible' : 'hidden' }}
              >
                10
              </Button>
            </TableCell>
          );
        })}

        {[
          { strokes: frontHoles.reduce((sum, n) => sum + getStrokes(pl.handicap, course.holes.find(x => x.number === n)!.handicap), 0), gross: frontGross, net: frontNet },
          { strokes: backHoles .reduce((sum, n) => sum + getStrokes(pl.handicap, course.holes.find(x => x.number === n)!.handicap), 0), gross: backGross, net: backNet },
          { strokes: 0,                            gross: totalGross,                     net: totalNet },
        ].map((sec, idx) => (
          <TableCell key={idx} align="center" sx={{ p: 0.5 }}>
            <Typography variant="caption">+{sec.strokes}</Typography>
            <Box
              sx={{
                width: 40,
                height: 50,
                mx: 'auto',
                border: '1px solid',
                borderColor: 'grey.400',
                borderRadius: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
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

          {playTens&&<Box component={Paper} sx={{p:2,mt:4}}><Typography variant="h6">Game of 10s</Typography>{players.map(pl=>{
            const ou = pl.selectedTens.reduce((s,h)=>(s+(pl.scores[`net_${h}`]||0)-course.holes.find(x=>x.number===h)!.par),0);
            const ts = pl.selectedTens.reduce((s,h)=>(s+(pl.scores[`net_${h}`]||0)),0);
            return <Box key={pl.id} sx={{mb:2}}><Typography>{pl.name}</Typography><Typography>Selected: {pl.selectedTens.length}/10</Typography><Typography>Total: {ts} ({ou>=0?'+':''}{ou})</Typography></Box>;
          })}</Box>}
        </>
      )}
    </Container>
  );
}
