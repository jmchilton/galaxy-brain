## wes-tes/pulsar-pod-staging:0.16.1.dev0-4ccfb64 (sha256:dd2377f2f74277a2d974517e4df67eeec7390372b81eb947ba174fa92b37e7a3)
pycurl PycURL/7.49.0 libcurl/8.23.0 OpenSSL/3.6.5 zlib/1.3.1 brotli/1.2.1 libpsl/0.21.5 libssh2/1.11.1_DEV nghttp2/1.70.0 ngtcp2/1.25.0 nghttp3/1.18.0 mit-krb5/1.22.2
get_file from pulsar.client.transport.curl - post_file from pulsar.client.transport.curl
peak RSS before upload 40 MB, after posting 400 MB 43 MB

## wes-tes/pulsar-pod-staging:0.16.1.dev0-07051ab (sha256:04065941d40e636f07f7693855087047ee8fbf025f320c9168b27d669044cb2a)
pycurl not installed
get_file from pulsar.client.transport.requests - post_file from pulsar.client.transport.requests
Posting /work/output.dat without requests_toolbelt: the entire file will be loaded into memory. Install requests_toolbelt (or pycurl, and use the curl transport) for streaming uploads.
peak RSS before upload 35 MB, after posting 400 MB 835 MB

## galaxy/pulsar-pod-staging:0.15.0.2 (sha256:2ccdf1d3b44814a6e11a3db6f33c6d13b047f5c728c7094330c62a044b1cff2c)
pycurl PycURL/7.45.1 libcurl/7.52.1 OpenSSL/1.0.2u zlib/1.2.11 libidn2/0.16 libpsl/0.17.0 (+libidn2/0.16) libssh2/1.7.0 nghttp2/1.18.1 librtmp/2.3
get_file from pulsar.client.transport.curl - post_file from pulsar.client.transport.curl
peak RSS before upload 70 MB, after posting 400 MB 72 MB

