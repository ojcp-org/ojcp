.PHONY: all spec diagrams clean

SPEC_SRC = spec/ojcp-v0.1.bs
SPEC_OUT = spec/ojcp-v0.1.html

MMDC = npx mmdc
MMD_SRC = $(wildcard diagrams/*.mmd)
IMG_DIR = content/images
IMG_PNG = $(patsubst diagrams/%.mmd,$(IMG_DIR)/%.png,$(MMD_SRC))

all: spec diagrams

spec: $(SPEC_OUT)

diagrams: $(IMG_PNG)

$(SPEC_OUT): $(SPEC_SRC)
	bikeshed spec $< $@

$(IMG_DIR)/%.png: diagrams/%.mmd node_modules | $(IMG_DIR)
	$(MMDC) -i $< -o $@ --scale 2 --configFile diagrams/mermaid.config.json

$(IMG_DIR):
	mkdir -p $@

node_modules: package.json
	npm install
	@touch $@

clean:
	rm -f $(SPEC_OUT) $(IMG_PNG)
