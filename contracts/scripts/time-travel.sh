#!/bin/bash
# Time travel utility for local Anvil blockchain
# Allows skipping time for testing Timelock, voting periods, etc.
#
# Usage:
#   ./scripts/time-travel.sh <duration>
#
# Duration formats:
#   30m       - 30 minutes
#   1h, 2h    - 1 hour, 2 hours
#   1d, 7d    - 1 day, 7 days
#   3600      - 3600 seconds (1 hour)
#
# Presets:
#   pending   - Skip pending period (1 hour)
#   voting    - Skip voting period (1 hour)
#   timelock  - Skip timelock delay (1 hour)
#   grace     - Skip grace period (14 days)
#   now       - Show current block timestamp
#
# Examples:
#   ./scripts/time-travel.sh 1h       # Skip 1 hour
#   ./scripts/time-travel.sh 7d       # Skip 7 days
#   ./scripts/time-travel.sh voting   # Skip voting period
#   ./scripts/time-travel.sh now      # Show current time

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/local-config.sh"

# Time constants (in seconds)
MINUTE=60
HOUR=3600
DAY=86400

# Preset durations
PENDING_PERIOD=$((1 * HOUR))  # 1 hour
VOTING_PERIOD=$((1 * HOUR))   # 1 hour
TIMELOCK_DELAY=$((1 * HOUR))  # 1 hour
GRACE_PERIOD=$((14 * DAY))    # 14 days

# Usage message
usage() {
    echo -e "${YELLOW}Time Travel - Anvil Time Control${NC}"
    echo ""
    echo "Usage: $0 <duration>"
    echo ""
    echo "Duration formats:"
    echo "  30m       - 30 minutes"
    echo "  1h, 2h    - 1 hour, 2 hours"
    echo "  1d, 7d    - 1 day, 7 days"
    echo "  3600      - 3600 seconds (1 hour)"
    echo ""
    echo "Presets:"
    echo "  pending   - Skip pending period (1 hour)"
    echo "  voting    - Skip voting period (1 hour)"
    echo "  timelock  - Skip timelock delay (1 hour)"
    echo "  grace     - Skip grace period (14 days)"
    echo "  now       - Show current block timestamp"
    echo ""
    echo "Examples:"
    echo "  $0 1h       # Skip 1 hour"
    echo "  $0 7d       # Skip 7 days"
    echo "  $0 voting   # Skip voting period"
    echo "  $0 now      # Show current time"
    exit 1
}

# Check if anvil is running
check_anvil() {
    if ! cast chain-id --rpc-url "$LOCAL_RPC_URL" &>/dev/null; then
        echo -e "${RED}Error: Cannot connect to Anvil at $LOCAL_RPC_URL${NC}"
        echo -e "Please start Anvil first:"
        echo -e "  ${CYAN}cd contracts && ./scripts/start-anvil.sh${NC}"
        echo -e "  or"
        echo -e "  ${CYAN}npm run anvil${NC}"
        exit 1
    fi
}

# Get current block timestamp
get_timestamp() {
    cast block latest --rpc-url "$LOCAL_RPC_URL" --json | jq -r '.timestamp' | xargs printf "%d"
}

# Format timestamp to human-readable date
format_timestamp() {
    local ts=$1
    if [[ "$OSTYPE" == "darwin"* ]]; then
        date -r "$ts" "+%Y-%m-%d %H:%M:%S %Z"
    else
        date -d "@$ts" "+%Y-%m-%d %H:%M:%S %Z"
    fi
}

# Format duration to human-readable string
format_duration() {
    local seconds=$1
    local days=$((seconds / DAY))
    local hours=$(((seconds % DAY) / HOUR))
    local minutes=$(((seconds % HOUR) / MINUTE))
    local secs=$((seconds % MINUTE))

    local result=""
    if [ $days -gt 0 ]; then
        result="${days}d "
    fi
    if [ $hours -gt 0 ]; then
        result="${result}${hours}h "
    fi
    if [ $minutes -gt 0 ]; then
        result="${result}${minutes}m "
    fi
    if [ $secs -gt 0 ] || [ -z "$result" ]; then
        result="${result}${secs}s"
    fi
    echo "$result" | sed 's/ $//'
}

# Parse duration string to seconds
parse_duration() {
    local input=$1
    local seconds=0

    # Check for presets
    case "$input" in
        pending)
            echo $PENDING_PERIOD
            return
            ;;
        voting)
            echo $VOTING_PERIOD
            return
            ;;
        timelock)
            echo $TIMELOCK_DELAY
            return
            ;;
        grace)
            echo $GRACE_PERIOD
            return
            ;;
    esac

    # Check for time unit suffix
    if [[ "$input" =~ ^([0-9]+)([mhd])$ ]]; then
        local value="${BASH_REMATCH[1]}"
        local unit="${BASH_REMATCH[2]}"

        case "$unit" in
            m)
                seconds=$((value * MINUTE))
                ;;
            h)
                seconds=$((value * HOUR))
                ;;
            d)
                seconds=$((value * DAY))
                ;;
        esac
    # Check for plain number (seconds)
    elif [[ "$input" =~ ^[0-9]+$ ]]; then
        seconds=$input
    else
        echo -e "${RED}Error: Invalid duration format: $input${NC}"
        usage
    fi

    echo $seconds
}

# Show current time
show_now() {
    check_anvil

    local ts=$(get_timestamp)
    local formatted=$(format_timestamp "$ts")

    echo -e "${YELLOW}=== Current Block Time ===${NC}"
    echo -e "Timestamp: ${GREEN}$ts${NC}"
    echo -e "Date:      ${GREEN}$formatted${NC}"
}

# Time travel function
time_travel() {
    local seconds=$1
    check_anvil

    local before_ts=$(get_timestamp)
    local before_formatted=$(format_timestamp "$before_ts")
    local duration_str=$(format_duration "$seconds")

    # Calculate blocks to mine (governance contract uses block numbers)
    local blocks=$((seconds / BLOCK_TIME_SECONDS))
    if [ "$blocks" -lt 1 ]; then
        blocks=1
    fi

    echo -e "${YELLOW}=== Time Travel ===${NC}"
    echo -e "Skipping: ${CYAN}$duration_str${NC} ($seconds seconds, $blocks blocks)"
    echo ""
    echo -e "Before: ${GREEN}$before_formatted${NC} (timestamp: $before_ts)"

    # Mine blocks with correct time interval
    # This advances both block number AND timestamp consistently
    cast rpc anvil_mine "$blocks" "$BLOCK_TIME_SECONDS" --rpc-url "$LOCAL_RPC_URL" > /dev/null

    local after_ts=$(get_timestamp)
    local after_formatted=$(format_timestamp "$after_ts")
    local actual_diff=$((after_ts - before_ts))

    echo -e "After:  ${GREEN}$after_formatted${NC} (timestamp: $after_ts)"
    echo -e "Blocks: ${CYAN}+$blocks${NC}"
    echo ""
    echo -e "${GREEN}Time travel complete!${NC}"
}

# Main
if [ $# -eq 0 ]; then
    usage
fi

case "$1" in
    -h|--help|help)
        usage
        ;;
    now)
        show_now
        ;;
    *)
        seconds=$(parse_duration "$1")
        if [ "$seconds" -gt 0 ]; then
            time_travel "$seconds"
        else
            echo -e "${RED}Error: Duration must be greater than 0${NC}"
            exit 1
        fi
        ;;
esac
