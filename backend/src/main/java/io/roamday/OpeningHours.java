package io.roamday;

import java.time.*;
import java.util.*;
import java.util.regex.*;

/** Accept a strict subset of OSM opening_hours; complex or exceptional rules stay unknown. */
final class OpeningHours {
    private static final List<String> DAYS = List.of("Mo","Tu","We","Th","Fr","Sa","Su");
    private static final Pattern RULE = Pattern.compile("(?:(Mo|Tu|We|Th|Fr|Sa|Su)(?:-(Mo|Tu|We|Th|Fr|Sa|Su))? )?([0-2][0-9]:[0-5][0-9])-([0-2][0-9]:[0-5][0-9])");
    private record Window(int first, int last, int start, int end) {
        boolean covers(ZonedDateTime time) {
            int day = time.getDayOfWeek().getValue()-1;
            int minute = time.getHour()*60 + time.getMinute();
            if (end>start) return onDay(day) && minute>=start && minute<end;
            return onDay(day) && minute>=start || onDay(Math.floorMod(day-1,7)) && minute<end;
        }
        boolean onDay(int day) { return Math.floorMod(day-first,7)<=Math.floorMod(last-first,7); }
    }

    static Boolean covers(String text, ZonedDateTime arrival, int duration) {
        if (text == null || text.length()>300) return null;
        if ("24/7".equals(text)) return true;
        List<Window> windows = new ArrayList<>();
        // Multiple overlapping day selectors have override semantics. Treat as unknown.
        Set<Integer> usedDays = new HashSet<>();
        for (String rule : text.strip().split(";",-1)) {
            var match=RULE.matcher(rule.strip());
            if (!match.matches()) return null;
            int first=match.group(1)==null?0:DAYS.indexOf(match.group(1));
            int last=match.group(1)==null?6:match.group(2)==null?first:DAYS.indexOf(match.group(2));
            int begin=minutes(match.group(3)), end=minutes(match.group(4));
            if (begin>=1440 || end>1440 || begin==end) return null;
            var w = new Window(first,last,begin,end);
            for(int i=0;i<7;i++) if(w.onDay(i) && !usedDays.add(i))return null;
            windows.add(w);
        }
        for(int i=0;i<duration;i++){
            var minute=arrival.plusMinutes(i);
            if(windows.stream().noneMatch(w -> w.covers(minute)))return false;
        }
        return true;
    }
    private static int minutes(String time) {
        return Integer.parseInt(time.substring(0,2))*60+Integer.parseInt(time.substring(3,5));
    }
}
