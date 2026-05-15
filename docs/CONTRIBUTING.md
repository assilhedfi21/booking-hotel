# Contributing

## Branching model

```
main         ← protected, only release-ready code
└── develop  ← integration branch
    ├── feature/<scope>
    └── fix/<scope>
```

- Branch from `develop`.
- Open a PR back to `develop`.
- Squash to `main` for releases.

## Commit convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(scope):     a new feature
fix(scope):      a bug fix
chore(scope):    plumbing / tooling
docs(scope):     documentation only
refactor(scope): no behaviour change
test(scope):     tests only
```

Example:
```
feat(booking-service): publish booking.created event on Kafka
```

## Local checklist before pushing

1. `npm install` (root) succeeds.
2. Each microservice starts with `npm run start:<svc>`.
3. `npm run start:gateway` boots and `GET /api/health` returns `200`.
4. The web client at `http://localhost:4000` lists hotels.
5. Booking → notification chain works (with Kafka up).
