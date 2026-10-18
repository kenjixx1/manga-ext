#!/bin/zsh
# Drive the Tachimanga Mac app (iPad app on Apple silicon) for testing Comix K.
# Screenshots are scaled to screen points, so a pixel in a "win" image is a point offset from the window origin,
# and "wclick X Y" takes coordinates read straight off that image.
#
#   ui.sh front                 bring Tachimanga to the front
#   ui.sh win [NAME]            screenshot of the Tachimanga window -> prints path, origin and size
#   ui.sh shot [NAME]           screenshot of the whole screen (points scale) -> prints path
#   ui.sh wclick X Y            click at X,Y measured on the last "win" image
#   ui.sh click X Y             click at screen point X,Y
#   ui.sh paste TEXT            put TEXT on the clipboard and press cmd+V (into the focused field)
#   ui.sh key KEY               press a key: return, esc, tab, arrow-up, ...
#
# Needs: brew install cliclick; Terminal allowed under Privacy & Security > Accessibility and Screen Recording.
set -e
OUT=${UI_OUT:-${TMPDIR:-/tmp}/comix-k-ui}
mkdir -p "$OUT"
ORIGIN_FILE="$OUT/.origin"

window_bounds() {
  # The largest Tachimanga window (the app also reports a thin menu-bar window)
  osascript -e 'tell application "System Events" to tell process "Tachimanga"
    set best to ""
    set bestArea to 0
    repeat with w in windows
      set {x, y} to position of w
      set {ww, hh} to size of w
      if ww * hh > bestArea then
        set bestArea to ww * hh
        set best to (x as text) & "," & (y as text) & "," & (ww as text) & "," & (hh as text)
      end if
    end repeat
    return best
  end tell'
}

to_front() {
  osascript -e 'tell application "Tachimanga" to activate'
  sleep 0.6
}

case $1 in
  front) to_front ;;
  win)
    name=${2:-win}
    to_front
    IFS=, read x y w h <<< "$(window_bounds)"
    screencapture -x -R "$x,$y,$w,$h" "$OUT/$name.png"
    sips -Z "$w" "$OUT/$name.png" --out "$OUT/$name.png" >/dev/null
    echo "$x,$y" > "$ORIGIN_FILE"
    echo "$OUT/$name.png origin=$x,$y size=${w}x$h" ;;
  shot)
    name=${2:-shot}
    screencapture -x "$OUT/$name.png"
    sips -Z "$(osascript -e 'tell application "Finder" to get item 3 of (get bounds of window of desktop)')" "$OUT/$name.png" --out "$OUT/$name.png" >/dev/null
    echo "$OUT/$name.png" ;;
  wclick)
    to_front
    IFS=, read ox oy < "$ORIGIN_FILE"
    cliclick "c:$((ox + $2)),$((oy + $3))" ;;
  click) to_front; cliclick "c:$2,$3" ;;
  paste) printf '%s' "$2" | pbcopy; cliclick kd:cmd t:v ku:cmd ;;
  key) cliclick "kp:$2" ;;
  *) sed -n '2,15p' "$0"; exit 1 ;;
esac
