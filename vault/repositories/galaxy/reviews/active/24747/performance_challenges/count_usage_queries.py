"""Count SQL statements and connection checkouts for GET /users/current/usages serialization."""
import galaxy
from collections import Counter
from unittest import mock

from sqlalchemy import event

from galaxy import model
from galaxy.app_unittest_utils.galaxy_mock import MockApp
from galaxy.managers.users import UserQuotaUsage, UserSerializer
from galaxy.util import nice_size

print("galaxy from", model.__file__)


def run(n_labels):
    app = MockApp()
    session = app.model.context
    user = model.User(email=f"u{n_labels}@example.org", password="x")
    user.username = f"u{n_labels}"
    session.add(user)
    session.commit()
    labels = [f"src{i}" for i in range(n_labels)]
    for label in labels:
        session.add(model.UserQuotaSourceUsage(user=user, quota_source_label=label, disk_usage=10))
        quota = model.Quota(name=f"q{label}", description="", amount=100, operation="=", quota_source_label=label)
        session.add(quota)
        session.add(model.UserQuotaAssociation(user, quota))
    session.commit()
    source_map = mock.Mock()
    source_map.ids_per_quota_source.return_value = {label: [label] for label in labels}
    app.object_store = mock.Mock()
    app.object_store.get_quota_source_map.return_value = source_map
    serializer = UserSerializer(app, mock.Mock())
    session.expire_all()
    user = session.get(model.User, user.id)

    engine = session.get_bind()
    statements = Counter()
    checkouts = []

    def on_exec(conn, cursor, statement, parameters, context, executemany):
        statements[" ".join(statement.split())[:45]] += 1

    def on_connect(conn):
        checkouts.append(1)

    event.listen(engine, "before_cursor_execute", on_exec)
    event.listen(engine, "engine_connect", on_connect)
    usages = serializer.serialize_disk_usage(user)
    event.remove(engine, "before_cursor_execute", on_exec)
    event.remove(engine, "engine_connect", on_connect)
    print(f"labels={n_labels} rows={len(usages)} statements={sum(statements.values())} connects={len(checkouts)}")
    for statement, count in statements.most_common():
        print(f"   {count:3d} {statement}")


for n in (0, 1, 3, 10):
    run(n)


def serialize_once_per_source(serializer, user):
    """Prototype: one get_quota per source, reusing get_percent's quota argument."""
    agent = serializer.app.quota_agent
    rval = []
    for usage in user.dictify_usage(serializer.app.object_store):
        label = usage.quota_source_label
        quota_bytes = agent.get_quota(user, quota_source_label=label)
        rval.append(
            UserQuotaUsage(
                quota_source_label=label,
                total_disk_usage=usage.total_disk_usage,
                quota_percent=agent.get_percent(user=user, quota=quota_bytes, quota_source_label=label),
                quota=nice_size(quota_bytes) if quota_bytes is not None else "unlimited",
                quota_bytes=quota_bytes,
            )
        )
    return rval


UserSerializer_orig = UserSerializer.serialize_disk_usage
print("--- prototype, output compared against current serializer")
for n in (0, 3, 10):
    app_results = {}
    def compare(self, user):
        expected = UserSerializer_orig(self, user)
        self.app.model.context.expire_all()
        engine = self.app.model.context.get_bind()
        counts = []
        listener = lambda *a: counts.append(1)
        event.listen(engine, "before_cursor_execute", listener)
        actual = serialize_once_per_source(self, user)
        event.remove(engine, "before_cursor_execute", listener)
        assert expected == actual, (expected, actual)
        print(f"labels={n} prototype statements={len(counts)} identical_output=True")
        return actual
    UserSerializer.serialize_disk_usage = compare
    run(n)
UserSerializer.serialize_disk_usage = UserSerializer_orig
