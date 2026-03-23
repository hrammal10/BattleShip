// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title BattleShip
 * @notice Full event-sourced on-chain record of BattleShip game state.
 *
 * One transaction per meaningful game event:
 *   1. createGame         — both players joined, game is live
 *   2. presidentsSelected — both presidents chosen
 *   3. shipsPlaced        — a player finished placing ships (fires twice per game)
 *   4. shotFired          — every shot (hit / miss / sunk)
 *   5. finalizeGame       — game over: winner + final board states
 *
 * All writes are signed by the single trusted operator.
 * Replaying events for a gameId reconstructs the complete game history.
 */
contract BattleShip {

    // Result encoding:    0=miss  1=hit  2=sunk
    // President encoding: 0=none  1=strategist  2=shield  3=provocateur  4=ghost  5=juggernaut

    enum Phase { INACTIVE, ACTIVE, FINISHED }

    struct GameRecord {
        Phase   phase;
        uint8   winner;
        uint8   p1President;
        uint8   p2President;
        bytes   board1;       // final 100-byte board (row-major, cell values 0-4)
        bytes   board2;
        uint256 createdAt;
        uint256 finalizedAt;
    }

    address public operator;
    mapping(bytes32 => GameRecord) public games;

    event GameCreated       (bytes32 indexed gameId, uint256 timestamp);
    event PresidentsSelected(bytes32 indexed gameId, uint8 p1President, uint8 p2President);
    event ShipsPlaced       (bytes32 indexed gameId, uint8 playerNum);
    event ShotFired         (bytes32 indexed gameId, uint8 playerNum, uint8 row, uint8 col, uint8 result);
    event GameFinalized     (bytes32 indexed gameId, uint8 winner, bytes board1, bytes board2, uint256 timestamp);

    modifier onlyOperator() {
        require(msg.sender == operator, "BattleShip: not operator");
        _;
    }

    constructor() {
        operator = msg.sender;
    }

    /** Called once both players have joined. */
    function createGame(bytes32 gameId) external onlyOperator {
        require(games[gameId].createdAt == 0, "BattleShip: game already exists");
        games[gameId].phase     = Phase.ACTIVE;
        games[gameId].createdAt = block.timestamp;
        emit GameCreated(gameId, block.timestamp);
    }

    /** Called once both players have selected their president. */
    function presidentsSelected(
        bytes32 gameId,
        uint8   p1President,
        uint8   p2President
    ) external onlyOperator {
        require(games[gameId].phase == Phase.ACTIVE, "BattleShip: game not active");
        games[gameId].p1President = p1President;
        games[gameId].p2President = p2President;
        emit PresidentsSelected(gameId, p1President, p2President);
    }

    /** Called when a player finishes placing their ships. playerNum is 1 or 2. */
    function shipsPlaced(bytes32 gameId, uint8 playerNum) external onlyOperator {
        require(games[gameId].phase == Phase.ACTIVE, "BattleShip: game not active");
        require(playerNum == 1 || playerNum == 2,    "BattleShip: invalid player");
        emit ShipsPlaced(gameId, playerNum);
    }

    /**
     * Called for every shot fired (including juggernaut sweeps and shield blocks).
     * @param playerNum  Shooting player (1 or 2)
     * @param row        Target row  (0-9)
     * @param col        Target col  (0-9)
     * @param result     0=miss  1=hit  2=sunk
     */
    function shotFired(
        bytes32 gameId,
        uint8   playerNum,
        uint8   row,
        uint8   col,
        uint8   result
    ) external onlyOperator {
        require(games[gameId].phase == Phase.ACTIVE, "BattleShip: game not active");
        emit ShotFired(gameId, playerNum, row, col, result);
    }

    /**
     * Called once the game ends.
     * @param winner  1 or 2
     * @param board1  Final 100-byte board for player 1 (row-major, values 0-4)
     * @param board2  Final 100-byte board for player 2
     */
    function finalizeGame(
        bytes32        gameId,
        uint8          winner,
        bytes calldata board1,
        bytes calldata board2
    ) external onlyOperator {
        require(games[gameId].phase == Phase.ACTIVE, "BattleShip: game not active");
        require(winner == 1 || winner == 2,          "BattleShip: invalid winner");
        require(board1.length == 100,                "BattleShip: invalid board1");
        require(board2.length == 100,                "BattleShip: invalid board2");

        GameRecord storage g = games[gameId];
        g.phase       = Phase.FINISHED;
        g.winner      = winner;
        g.board1      = board1;
        g.board2      = board2;
        g.finalizedAt = block.timestamp;

        emit GameFinalized(gameId, winner, board1, board2, block.timestamp);
    }

    function getGame(bytes32 gameId)
        external view
        returns (Phase phase, uint8 winner, uint8 p1President, uint8 p2President, uint256 createdAt, uint256 finalizedAt)
    {
        GameRecord storage g = games[gameId];
        return (g.phase, g.winner, g.p1President, g.p2President, g.createdAt, g.finalizedAt);
    }

    function getBoards(bytes32 gameId)
        external view
        returns (bytes memory board1, bytes memory board2)
    {
        return (games[gameId].board1, games[gameId].board2);
    }
}
