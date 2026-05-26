.PHONY: proto proto-gateway proto-worker venv

PYTHON := python3

# Create virtual environment
venv:
	$(PYTHON) -m venv .venv
	.venv/bin/pip install --upgrade pip
	.venv/bin/pip install grpcio-tools==1.66.0

# Generate Python gRPC stubs from proto definition
proto: proto-gateway proto-worker

proto-gateway:
	.venv/bin/python -m grpc_tools.protoc \
		-I proto/ \
		--python_out=gateway/ \
		--grpc_python_out=gateway/ \
		proto/inference.proto

proto-worker:
	.venv/bin/python -m grpc_tools.protoc \
		-I proto/ \
		--python_out=worker/ \
		--grpc_python_out=worker/ \
		proto/inference.proto
