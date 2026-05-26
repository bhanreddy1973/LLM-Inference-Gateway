.PHONY: proto proto-gateway proto-worker

# Generate Python gRPC stubs from proto definition
proto: proto-gateway proto-worker

proto-gateway:
	python -m grpc_tools.protoc \
		-I proto/ \
		--python_out=gateway/ \
		--grpc_python_out=gateway/ \
		proto/inference.proto

proto-worker:
	python -m grpc_tools.protoc \
		-I proto/ \
		--python_out=worker/ \
		--grpc_python_out=worker/ \
		proto/inference.proto
