.PHONY: all spec diagrams clean

SPEC_SRC = $(wildcard spec/*.bs)
SITE_DIR = _site

MMDC = npx mmdc
MMD_SRC = $(wildcard diagrams/*.mmd)
IMG_DIR = content/images
IMG_PNG = $(patsubst diagrams/%.mmd,$(IMG_DIR)/%.png,$(MMD_SRC))

all: spec diagrams

spec: $(SITE_DIR)/index.html

diagrams: $(IMG_PNG)

$(SITE_DIR)/index.html: $(SPEC_SRC) scripts/build-spec.sh
	scripts/build-spec.sh . $(SITE_DIR)

$(IMG_DIR)/%.png: diagrams/%.mmd node_modules | $(IMG_DIR)
	$(MMDC) -i $< -o $@ --scale 2 --configFile diagrams/mermaid.config.json

$(IMG_DIR):
	mkdir -p $@

node_modules: package.json
	npm install
	@touch $@

clean:
	rm -rf $(SITE_DIR) $(IMG_PNG)
