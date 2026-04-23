# Team Sizing Logic - Test Cases

## Current Implementation

```javascript
const teamSize = Math.floor(totalPlayers / 2);
const bench = totalPlayers % 2;
```

## Test Cases

### Even Numbers

| Players | Calculation | Team Size | Teams | Bench | Result |
|---------|-------------|-----------|-------|-------|--------|
| 2       | 2/2 = 1     | 1         | 1v1   | 0     | ✅ Correct |
| 4       | 4/2 = 2     | 2         | 2v2   | 0     | ✅ Correct |
| 6       | 6/2 = 3     | 3         | 3v3   | 0     | ✅ Correct |
| 8       | 8/2 = 4     | 4         | 4v4   | 0     | ✅ Correct |
| 10      | 10/2 = 5    | 5         | 5v5   | 0     | ✅ Correct |
| 12      | 12/2 = 6    | 6         | 6v6   | 0     | ✅ Correct |

### Odd Numbers

| Players | Calculation | Team Size | Teams | Bench | Result |
|---------|-------------|-----------|-------|-------|--------|
| 3       | 3/2 = 1.5 → 1 | 1       | 1v1   | 1     | ✅ Correct |
| 5       | 5/2 = 2.5 → 2 | 2       | 2v2   | 1     | ✅ Correct |
| 7       | 7/2 = 3.5 → 3 | 3       | 3v3   | 1     | ✅ Correct |
| 9       | 9/2 = 4.5 → 4 | 4       | 4v4   | 1     | ✅ Correct |
| 11      | 11/2 = 5.5 → 5 | 5      | 5v5   | 1     | ✅ Correct |
| 13      | 13/2 = 6.5 → 6 | 6      | 6v6   | 1     | ✅ Correct |

## Edge Cases

### Minimum (2 players)
```
Input: 2 players
Team Size: floor(2/2) = 1
Bench: 2 % 2 = 0
Result: 1v1, no bench ✅
```

### Very Small Odd (3 players)
```
Input: 3 players
Team Size: floor(3/2) = 1
Bench: 3 % 2 = 1
Result: 1v1 + 1 bench ✅
```

### Large Even (20 players)
```
Input: 20 players
Team Size: floor(20/2) = 10
Bench: 20 % 2 = 0
Result: 10v10, no bench ✅
```

### Large Odd (21 players)
```
Input: 21 players
Team Size: floor(21/2) = 10
Bench: 21 % 2 = 1
Result: 10v10 + 1 bench ✅
```

## Formula Verification

### For Even Number of Players
```
n = even number
teamSize = n/2
bench = 0
Each team gets exactly n/2 players
```

### For Odd Number of Players
```
n = odd number
teamSize = (n-1)/2
bench = 1
Each team gets (n-1)/2 players, 1 goes to bench
```

## Conclusion

✅ **The current logic is correct for all cases**

The formula `Math.floor(totalPlayers / 2)` naturally handles:
- Even numbers: Splits perfectly in half
- Odd numbers: Creates equal teams with 1 bench player

No special cases needed.
