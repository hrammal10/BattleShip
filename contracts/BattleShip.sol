// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title BattleShip
 * @notice Minimal on-chain record of BattleShip game outcomes.
 *
 * Three transactions per game:
 *   1. createGame   — game lobby opened
 *   2. joinGame     — second player joined, game is live
 *   3. finalizeGame — game over: winner, presidents used, final board states
 *
 * The server is the single trusted operator that signs all transactions.
 * Real-time state lives in server memory; this contract is the permanent result log.
 */
contract BattleShip {

    // President encoding: 0=none 1=strategist 2=shield 3=provocateur 4=ghost 5=juggernaut

    enum Phase { WAITING, ACTIVE, FINISHED }

    struct GameRecord {
        Phase   phase;
        uint8   winner;       // 1 or 2
        uint8   p1President;
        uint8   p2President;
        bytes   board1;       // final 100-byte board (row-major, cell values 0-4)
        bytes   board2;
        uint256 createdAt;
        uint256 finalizedAt;
    }

    address public operator;
    mapping(bytes32 => GameRecord) public games;

    event GameCreated  (bytes32 indexed gameId, uint256 timestamp);
    event GameJoined   (bytes32 indexed gameId);
    event GameFinalized(
        bytes32 indexed gameId,
        uint8   winner,
        uint8   p1President,
        uint8   p2President,
        bytes   board1,
        bytes   board2,
        uint256 timestamp
    );

    modifier onlyOperator() {
        require(msg.sender == operator, "BattleShip: not operator");
        _;
    }

    constructor() {
        operator = msg.sender;
    }

    function createGame(bytes32 gameId) external onlyOperator {
        require(games[gameId].createdAt == 0, "BattleShip: game already exists");
        games[gameId].phase     = Phase.WAITING;
        games[gameId].createdAt = block.timestamp;
        emit GameCreated(gameId, block.timestamp);
    }

    function joinGame(bytes32 gameId) external onlyOperator {
        require(games[gameId].createdAt != 0,         "BattleShip: game not found");
        require(games[gameId].phase == Phase.WAITING, "BattleShip: game already active");
        games[gameId].phase = Phase.ACTIVE;
        emit GameJoined(gameId);
    }

    /**
     * @param winner       1 or 2
     * @param p1President  President id for player 1 (1-5)
     * @param p2President  President id for player 2 (1-5)
     * @param board1       Final 100-byte board for player 1 (row-major, values 0-4)
     * @param board2       Final 100-byte board for player 2
     */
    function finalizeGame(
        bytes32        gameId,
        uint8          winner,
        uint8          p1President,
        uint8          p2President,
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
        g.p1President = p1President;
        g.p2President = p2President;
        g.board1      = board1;
        g.board2      = board2;
        g.finalizedAt = block.timestamp;

        emit GameFinalized(gameId, winner, p1President, p2President, board1, board2, block.timestamp);
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
