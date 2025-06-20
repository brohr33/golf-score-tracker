// BUILD 4 snapshot
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
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [searchError, setSearchError] = useState<string>();
  const [playTens, setPlayTens] = useState(false);

  useEffect(() => {
    if (searchInput.length < 2) {
      setOptions([]);
      return;
    }
    setLoadingSearch(true);
    setSearchError(undefined);
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://api.golfcourseapi.com/courses/search?keyword=${encodeURIComponent(searchInput)}`,
          { headers: { Authorization: 'Key VLNANFMEVIQBJ6T75A52WMQUKI' }, signal: controller.signal }
        );
        if (!res.ok) throw new Error(`Search error: ${res.status}`);
        const data = await res.json();
        setOptions(data.courses || []);
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          setSearchError(err.message);
          setOptions([]);
        }
      } finally {
        setLoadingSearch(false);
      }
    }, 300);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [searchInput]);

  const fetchCourseById = async (id: string) => {
    try {
      const res = await fetch(`https://api.golfcourseapi.com/courses/${id}`, {
        headers: { Authorization: 'Key VLNANFMEVIQBJ6T75A52WMQUKI' }
      });
      if (!res.ok) throw new Error('Course fetch error');
      const { course: raw } = await res.json();
      const normalized: Course = {
        id: raw.id,
        name: raw.name,
        metadata: {
          totalPar: raw.holes.reduce((sum: number, h: any) => sum + h.par, 0),
          slope: raw.slope,
          rating: raw.rating,
          location: raw.location
        },
        holes: raw.holes.map((h: any) => ({ number: h.number, par: h.par, handicap: h.strokeIndex }))
      };
      setCourse(normalized);
    } catch {
      setCourse(augustaPlaceholder);
    }
  };

  const useAugustaCourse = () => setCourse(augustaPlaceholder);
  const addPlayer = () => { if (players.length < 4) setPlayers(prev => [...prev, { id: Date.now().toString(), name: '', handicap: 0, scores: {}, selectedTens: [] }]); };
  const updatePlayer = (id: string, updates: Partial<Player>) => setPlayers(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
  const getStrokes = (playerHandicap: number, holeHandicap: number) => {
    if (!course) return 0;
    const base = Math.floor(playerHandicap / course.holes.length);
    const remain = playerHandicap % course.holes.length;
    return base + (holeHandicap <= remain ? 1 : 0);
  };
  const handleScoreChange = (pid: string, holeNum: number, gross: number) => {
    if (!course) return;
    const player = players.find(p => p.id === pid)!;
    const hole = course.holes.find(h => h.number === holeNum)!;
    const net = gross - getStrokes(player.handicap, hole.handicap);
    setPlayers(prev => prev.map(pl => pl.id === pid ? { ...pl, scores: { ...pl.scores, [holeNum]: gross, [`net_${holeNum}`]: net } } : pl));
  };
  const toggleTenHole = (pid: string, hole: number) => {
    setPlayers(prev => prev.map(pl => pl.id === pid ? { ...pl, selectedTens: pl.selectedTens.includes(hole) ? pl.selectedTens.filter(hn => hn!==hole) : pl.selectedTens.length<10 ? [...pl.selectedTens,hole] : pl.selectedTens } : pl));
  };
  const sumRange = (arr: number[], fn: (n: number) => number) => arr.reduce((s,n) => s+fn(n),0);

  return (
    <Container sx={{ py:4 }}>
      <Box component={Paper} sx={{p:2,mb:4}}>
        <Typography variant="h6">Players</Typography>
        {players.map((pl,i)=>(
          <Box key={pl.id} sx={{display:'flex',gap:2,mb:1}}>
            <TextField label={`Player ${i+1}`} value={pl.name} onChange={e=>updatePlayer(pl.id,{name:e.target.value})} />
            <TextField label="Handicap" type="number" value={pl.handicap} onChange={e=>updatePlayer(pl.id,{handicap:+e.target.value})} sx={{width:100}} />
          </Box>
        ))}
        <Button variant="contained" onClick={addPlayer} disabled={players.length>=4}>Add Player</Button>
      </Box>
      <Box component={Paper} sx={{p:2,mb:4}}>
        <Typography variant="h6">Course Search</Typography>
        <Autocomplete
          value={course}
          options={options}
          loading={loadingSearch}
          noOptionsText={searchError || 'No courses found'}
          getOptionLabel={opt => opt.name}
          onInputChange={(_, v) => setSearchInput(v)}
          onChange={(_, v) => v && fetchCourseById(v.id)}
          renderInput={params => <TextField {...params} label="Search Course" fullWidth />}
        />}
        />}
        />}
        />}
        />}
        />} />
        <Button variant="outlined" sx={{mt:2}} onClick={useAugustaCourse}>Use Augusta</Button>
        <FormControlLabel control={<Switch checked={playTens} onChange={e=>setPlayTens(e.target.checked)} />} label="Play 10s?" sx={{ml:2}} />
      </Box>
      {course && (
        <>
          <Typography variant="h4" gutterBottom>Golf Score Tracker</Typography>
          <Table component={Paper} sx={{mt:2}}>
            <TableHead>
              <TableRow>
                {course.holes.map(h=>(<TableCell key={h.number} align="center"><Typography>{h.number}</Typography></TableCell>))}
                <TableCell align="center">Front 9</TableCell>
                <TableCell align="center">Back 9</TableCell>
                <TableCell align="center">Total</TableCell>
              </TableRow>
              <TableRow>
                {course.holes.map(h=>(<TableCell key={h.number} align="center"><Typography variant="caption">{h.handicap}</Typography></TableCell>))}
                <TableCell /><TableCell /><TableCell />
              </TableRow>
              <TableRow>
                {course.holes.map(h=>(<TableCell key={h.number} align="center"><Typography variant="caption">{h.par}</Typography></TableCell>))}
                <TableCell align="center"><Typography variant="caption">{sumRange(course.holes.slice(0,9).map(h=>h.number),n=>course.holes.find(x=>x.number===n)!.par)}</Typography></TableCell>
                <TableCell align="center"><Typography variant="caption">{sumRange(course.holes.slice(9).map(h=>h.number),n=>course.holes.find(x=>x.number===n)!.par)}</Typography></TableCell>
                <TableCell align="center"><Typography variant="caption">{course.metadata.totalPar}</Typography></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {players.map(pl=>{
                const frontH=course.holes.slice(0,9).map(h=>h.number);
                const backH=course.holes.slice(9).map(h=>h.number);
                const fg=sumRange(frontH,n=>pl.scores[n]||0);
                const bg=sumRange(backH,n=>pl.scores[n]||0);
                const fn=sumRange(frontH,n=>pl.scores[`net_${n}`]||0);
                const bn=sumRange(backH,n=>pl.scores[`net_${n}`]||0);
                const tg=fg+bg, tn=fn+bn;
                return (
                  <TableRow key={pl.id}>
                    {course.holes.map(h=>{
                      const strokes=getStrokes(pl.handicap,h.handicap);
                      return (
                        <TableCell key={h.number} align="center" sx={{width:40,height:50,p:0}}>
                          <Typography variant="caption">+{strokes}</Typography>
                          <Box sx={{width:'100%',height:'100%',position:'relative'}}>
                            {playTens&&<Button size="small" variant={pl.selectedTens.includes(h.number)?'contained':'outlined'} onClick={()=>toggleTenHole(pl.id,h.number)} sx={{position:'absolute',top:0,left:0,width:'100%',height:'100%',p:0}}>10</Button>}
                            <TextField type="text" inputMode="numeric" pattern="[0-9]*" value={pl.scores[h.number]||''} onChange={e=>handleScoreChange(pl.id,h.number,Number(e.target.value)||0)} sx={{position:'absolute',top:0,left:0,width:'100%',height:'100%','& .MuiInputBase-input':{textAlign:'center'}}} />
                            <Typography variant="caption" sx={{position:'absolute',bottom:0,width:'100%',textAlign:'center'}}>Net: {pl.scores[`net_${h.number}`]||''}</Typography>
                          </Box>
                        </TableCell>
                      );
                    })}
                    <TableCell align="center"><Box sx={{width:40,height:50,position:'relative'}}><TextField type="text" inputMode="numeric" pattern="[0-9]*" value={fg} InputProps={{readOnly:true}} sx={{position:'absolute',top:0,left:0,width:'100%',height:'100%','& .MuiInputBase-input':{textAlign:'center'}}} /></Box><Typography variant="caption">Net: {fn}</Typography></TableCell>
                    <TableCell align="center"><Box sx={{width:40,height:50,position:'relative'}}><TextField type="text" inputMode="numeric" pattern="[0-9]*" value={bg} InputProps={{readOnly:true}} sx={{position:'absolute',top:0,left:0,width:'100%',height:'100%','& .MuiInputBase-input':{textAlign:'center'}}} /></Box><Typography variant="caption">Net: {bn}</Typography></TableCell>
                    <TableCell align="center"><Box sx={{width:40,height:50,position:'relative'}}><TextField type="text" inputMode="numeric" pattern="[0-9]*" value={tg} InputProps={{readOnly:true}} sx={{position:'absolute',top:0,left:0,width:'100%',height:'100%','& .MuiInputBase-input':{textAlign:'center'}}} /></Box><Typography variant="caption">Net: {tn}</Typography></TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </>
      )}
    </Container>
  );
}

