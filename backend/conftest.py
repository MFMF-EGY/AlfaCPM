import pytest
from django.db import connections


@pytest.fixture(scope='session', autouse=True)
def create_test_project(django_db_blocker, request):
    with django_db_blocker.unblock():
        from CommercialAPI.views import ProcessRequest
        # Creating test project before tests
        TestProjectID = ProcessRequest.CreateProject({"ProjectName":"foo","ProjectDescription":"Test Project"}, Test=True)
        print(f"Created Test Project with ID: {TestProjectID}")
        yield TestProjectID

        with connections["MainDB"].cursor() as cursor:
            cursor.execute(f"DROP DATABASE IF EXISTS Project{TestProjectID};")
            cursor.execute("DELETE FROM Projects_Table WHERE Project_ID = %s", [TestProjectID])
        connections["MainDB"].commit()
        print(f"Deleted Test Project with ID: {TestProjectID}")