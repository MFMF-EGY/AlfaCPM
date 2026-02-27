from django.db import connections
from django.conf import settings
# connections.databases["MainDB"] = {
#     'ENGINE': 'django.db.backends.mysql',
#     'NAME': 'MainDB',
#     'HOST': 'localhost',
#     'PORT': '3306',
#     'USER': 'alfacpm',
#     'PASSWORD': '000600',
#     'OPTIONS': {
#         'charset': 'utf8mb4'
#     },
#     'AUTOCOMMIT': False,
#     'TIME_ZONE': settings.TIME_ZONE,
#     'CONN_HEALTH_CHECKS': False,
#     'CONN_MAX_AGE': 0,
#     'ATOMIC_REQUESTS': False,
#     'TEST': {
#         'NAME': 'MainDB',
#         'MIRROR': None,
#         'CHARSET': None,
#         'COLLATION': None,
#         'MIGRATE': False,
#     },
# }
MainDBCursor = connections["MainDB"].cursor()

