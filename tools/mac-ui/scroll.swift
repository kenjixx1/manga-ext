// Scroll at a screen point: scroll X Y AMOUNT (negative AMOUNT scrolls down). Used by ui.sh "scroll".
import CoreGraphics
import Foundation

let args = CommandLine.arguments
guard args.count == 4, let x = Double(args[1]), let y = Double(args[2]), let amount = Int32(args[3]) else {
    print("usage: scroll X Y AMOUNT"); exit(1)
}
let point = CGPoint(x: x, y: y)
CGEvent(mouseEventSource: nil, mouseType: .mouseMoved, mouseCursorPosition: point, mouseButton: .left)?.post(tap: .cghidEventTap)
usleep(100_000)
for _ in 0..<abs(amount) {
    CGEvent(scrollWheelEvent2Source: nil, units: .line, wheelCount: 1, wheel1: amount < 0 ? -5 : 5, wheel2: 0, wheel3: 0)?
        .post(tap: .cghidEventTap)
    usleep(30_000)
}
