# SubNode

A Node.js (Typescript) app to check for new subdomains and notify if found any

## Table of contents

- [Installation](#installation)
  - [Cloning](#cloning)
  - [Configuration](#configuration)
  - [Writing docker-compose.yml](#writing-docker-composeyml)
  - [Running subnode](#running-subnode)

## Installation

To be able to install SubNode you need [Docker](https://www.digitalocean.com/community/tutorials/how-to-install-and-use-docker-on-ubuntu-22-04), [Docker Compose](https://www.digitalocean.com/community/tutorial-collections/how-to-install-docker-compose) and [Git](https://git-scm.com/book/en/v2/Getting-Started-Installing-Git) installed.

### Cloning

First clone this repository using this command:

```bash
git clone https://github.com/aigic8/subnode
```

### Configuration

Alongside `subnode` dir, create a directory called `config` and inside that create a dir called `subnode`. Copy and rename `subnode.sample.json` to `subnode` dir and call it `subnode.json` using this command:

```bash
mkdir -p config/subnode
cp subnode/subnode.sample.json config/subnode/subnode.json
```

Your tree should look like this:

```text
subnode/
  Dockerfile
  subnode.sample.json
  src/
  ...
config/
  subnode/
    subnode.json
```

Then edit `config/subnode/subnode.json` based on your needs.

### Writing docker-compose.yml

Create a file named `docker-compose.yml` alongside `subnode` and `config` dirs. Write this content in it:

```yaml
version: "3.9"
  subnode:
    build: ./subnode
    restart: always
    ports:
      - 8080:8080 # change the port based on your need
    links:
      - mongodb:mongodb # the hostname of db, should be used in config file
    volumes:
      - ./config/subnode:/usr/src/app/config
    environment:
      - CONFIG_PATH=/usr/src/app/config/subnode.json
    container_name: subnode
  mongodb:
    image: mongo:latest
    restart: always
    ports:
      - "127.0.0.1:27017:27017"
    container_name: mongodb
```

### Running subnode

Now you can easily run the application using this command:

```bash
docker compose up -d mongodb
docker compose up -d subnode
```
